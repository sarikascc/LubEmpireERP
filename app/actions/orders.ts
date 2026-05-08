"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Helper function to safely convert capacities regardless of casing (Ml, ml, Gm, gm, Kg)
function getConvertedVolume(
  pieces: number,
  capacityPerPiece: number,
  capUnit: string,
  fpUnit: string,
) {
  let volume = Number(capacityPerPiece || 0) * pieces;
  const cUnit = (capUnit || "").toLowerCase();
  const fUnit = (fpUnit || "").toLowerCase();

  if (
    (cUnit === "ml" && (fUnit === "ltr" || fUnit === "liter")) ||
    ((cUnit === "gm" || cUnit === "grams" || cUnit === "gram") &&
      fUnit === "kg")
  ) {
    volume /= 1000;
  }
  return volume;
}

export async function createOrderAction(formData: FormData) {
  const customer_name = formData.get("customer_name") as string;
  const finished_product_id = formData.get("finished_product_id") as string;
  const container_id = formData.get("container_id") as string;
  const boxes_quantity = Number(formData.get("boxes_quantity"));
  const rate_per_piece = Number(formData.get("rate_per_piece"));
  const order_date = (formData.get("order_date") as string) || "";

  const sticker_id = (formData.get("sticker_id") as string) || null;
  const sticker_quantity = Number(formData.get("sticker_quantity")) || 0;

  const supabase = await createClient();

  const { data: container } = await supabase
    .from("containers")
    .select("*")
    .eq("id", container_id)
    .single();
  const { data: fp } = await supabase
    .from("finished_products")
    .select("*")
    .eq("id", finished_product_id)
    .single();

  if (!container || !fp || !customer_name) {
    return { error: "Missing required data to process this order." };
  }

  // If user picked a date (YYYY-MM-DD), store it as UTC midnight for stable filtering
  const createdAt =
    order_date && /^\d{4}-\d{2}-\d{2}$/.test(order_date)
      ? `${order_date}T00:00:00.000Z`
      : undefined;

  const total_pieces = boxes_quantity * container.pieces_per_box;
  const total_amount = total_pieces * rate_per_piece;

  const bulkVolumeToDeduct = getConvertedVolume(
    total_pieces,
    container.capacity_per_piece,
    container.capacity_unit,
    fp.unit,
  );

  const reqBoxes = boxes_quantity;
  const reqCaps = total_pieces * (container.cap_quantity || 0);
  const reqStickers = total_pieces * sticker_quantity;

  const actualInventoryContainerId =
    container.base_container_id || container.id;
  const { data: targetContainer } = await supabase
    .from("containers")
    .select("stock, name")
    .eq("id", actualInventoryContainerId)
    .single();

  if (Number(fp.stock) < bulkVolumeToDeduct) {
    return {
      error: `Insufficient Oil! Need ${bulkVolumeToDeduct}${fp.unit}, have ${fp.stock}${fp.unit}.`,
    };
  }
  if (Number(targetContainer?.stock || 0) < total_pieces) {
    return {
      error: `Insufficient Empty ${targetContainer?.name}! Need ${total_pieces} PCS, have ${targetContainer?.stock} PCS.`,
    };
  }

  const materialIds = [container.box_id, container.cap_id, sticker_id].filter(
    Boolean,
  );
  const { data: materials } = await supabase
    .from("materials")
    .select("id, name, stock, cost_per_unit")
    .in("id", materialIds);

  const boxStock = materials?.find((m) => m.id === container.box_id);
  const capStock = materials?.find((m) => m.id === container.cap_id);
  const stickerStock = materials?.find((m) => m.id === sticker_id);

  if (container.box_id && (!boxStock || boxStock.stock < reqBoxes))
    return { error: `Insufficient Boxes!` };
  if (container.cap_id && (!capStock || capStock.stock < reqCaps))
    return { error: `Insufficient Caps!` };
  if (sticker_id && (!stickerStock || stickerStock.stock < reqStickers))
    return { error: `Insufficient Stickers!` };

  const oilCost = bulkVolumeToDeduct * Number(fp.cost_per_unit || 0);
  const bottleCost = total_pieces * Number(container.cost_per_piece || 0);
  const boxCost = container.box_id
    ? reqBoxes * Number(boxStock?.cost_per_unit || 0)
    : 0;
  const capCost = container.cap_id
    ? reqCaps * Number(capStock?.cost_per_unit || 0)
    : 0;
  const stickerCost = sticker_id
    ? reqStickers * Number(stickerStock?.cost_per_unit || 0)
    : 0;

  const totalCostOfGoods =
    oilCost + bottleCost + boxCost + stickerCost + capCost;
  const realCalculatedProfit = total_amount - totalCostOfGoods;

  // --- EXECUTE DEDUCTIONS ---
  await supabase
    .from("finished_products")
    .update({ stock: Number(fp.stock) - bulkVolumeToDeduct })
    .eq("id", fp.id);
  await supabase
    .from("containers")
    .update({ stock: Number(targetContainer!.stock) - total_pieces })
    .eq("id", actualInventoryContainerId);

  await supabase.from("container_transactions").insert({
    container_id: actualInventoryContainerId,
    transaction_type: "Order Use",
    quantity: -Math.abs(total_pieces),
    reason: `Sales Order: ${customer_name}`,
  });

  const deductMaterial = async (id: string, qty: number, stock: number) => {
    if (!id || qty <= 0) return;
    await supabase
      .from("materials")
      .update({ stock: stock - qty })
      .eq("id", id);
    await supabase.from("material_transactions").insert({
      material_id: id,
      transaction_type: "Order Use",
      quantity: -Math.abs(qty),
      reason: `Order for ${customer_name}`,
    });
  };

  if (container.box_id)
    await deductMaterial(container.box_id, reqBoxes, boxStock!.stock);
  if (container.cap_id)
    await deductMaterial(container.cap_id, reqCaps, capStock!.stock);
  if (sticker_id)
    await deductMaterial(sticker_id, reqStickers, stickerStock!.stock);

  const { error: orderError } = await supabase.from("orders").insert({
    customer_name,
    finished_product_id,
    container_id,
    boxes_quantity,
    rate_per_piece,
    total_amount,
    outstanding_amount: total_amount,
    calculated_profit: realCalculatedProfit,
    sticker_id,
    sticker_quantity,
    ...(createdAt ? { created_at: createdAt } : {}),
  });

  if (orderError) return { error: `Order Error: ${orderError.message}` };

  const rate_per_box = rate_per_piece * container.pieces_per_box;

  await supabase.from("accounting_entries").insert({
    entry_type: "Income",
    amount: total_amount,
    quantity: boxes_quantity,
    rate: rate_per_box,
    unit: "Boxes",
    description: `Sales Order - ${customer_name} (${boxes_quantity} Cartons of ${fp.product_name})`,
    profit: realCalculatedProfit,
    ...(createdAt ? { created_at: createdAt } : {}),
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function editOrderAction(formData: FormData) {
  const orderId = formData.get("id") as string;
  const newCustomerName = formData.get("customer_name") as string;
  const newBoxesQty = Number(formData.get("boxes_quantity"));
  const newRate = Number(formData.get("rate_per_piece"));

  const newStickerId = (formData.get("sticker_id") as string) || null;
  const newStickerQty = Number(formData.get("sticker_quantity")) || 0;

  if (!orderId || !newCustomerName || newBoxesQty <= 0 || newRate <= 0)
    throw new Error("Invalid input data.");

  const supabase = await createClient();

  try {
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
    if (!order) throw new Error("Order not found.");

    const { data: container } = await supabase
      .from("containers")
      .select("*")
      .eq("id", order.container_id)
      .single();
    const { data: fp } = await supabase
      .from("finished_products")
      .select("*")
      .eq("id", order.finished_product_id)
      .single();

    if (!container || !fp)
      throw new Error("Missing container or product data.");

    const actualInventoryContainerId =
      container.base_container_id || container.id;
    const { data: targetContainer } = await supabase
      .from("containers")
      .select("stock, name")
      .eq("id", actualInventoryContainerId)
      .single();

    const oldPieces = order.boxes_quantity * container.pieces_per_box;
    const oldStickers = oldPieces * (order.sticker_quantity || 0);
    const oldCaps = oldPieces * (container.cap_quantity || 0);

    const boxDelta = newBoxesQty - order.boxes_quantity;
    const pieceDelta = boxDelta * container.pieces_per_box;
    const capDelta = pieceDelta * (container.cap_quantity || 0);

    const bulkVolumeDelta = getConvertedVolume(
      pieceDelta,
      container.capacity_per_piece,
      container.capacity_unit,
      fp.unit,
    );

    // Fetch all materials needed to check stocks
    const materialIds = [
      container.box_id,
      container.cap_id,
      newStickerId,
    ].filter(Boolean);
    const { data: materials } = await supabase
      .from("materials")
      .select("id, stock, cost_per_unit")
      .in("id", materialIds);

    const boxStock = materials?.find((m) => m.id === container.box_id);
    const capStock = materials?.find((m) => m.id === container.cap_id);
    const newStickerStock = materials?.find((m) => m.id === newStickerId);

    // PRE-FLIGHT CHECKS
    if (boxDelta > 0) {
      if (Number(fp.stock) < bulkVolumeDelta)
        throw new Error(
          `Insufficient Oil! Need ${bulkVolumeDelta}${fp.unit} more.`,
        );
      if (Number(targetContainer!.stock) < pieceDelta)
        throw new Error(
          `Insufficient ${targetContainer!.name}! Need ${pieceDelta} more.`,
        );
      if (container.box_id && (!boxStock || boxStock.stock < boxDelta))
        throw new Error("Insufficient Boxes!");
      if (container.cap_id && (!capStock || capStock.stock < capDelta))
        throw new Error("Insufficient Caps!");
    }

    const newTotalPieces = newBoxesQty * container.pieces_per_box;
    const newTotalStickers = newTotalPieces * newStickerQty;

    // Check sticker limits if changed or increased
    if (newStickerId) {
      if (order.sticker_id !== newStickerId) {
        if (!newStickerStock || newStickerStock.stock < newTotalStickers)
          throw new Error("Insufficient stock for the new Sticker selected!");
      } else {
        const stickerDelta = newTotalStickers - oldStickers;
        if (
          stickerDelta > 0 &&
          (!newStickerStock || newStickerStock.stock < stickerDelta)
        )
          throw new Error(
            "Insufficient stock for Stickers to increase the order!",
          );
      }
    }

    const adjustMaterial = async (id: string, deltaQty: number) => {
      if (!id || deltaQty === 0) return;
      const { data: mat } = await supabase
        .from("materials")
        .select("stock")
        .eq("id", id)
        .single();
      if (mat) {
        await supabase
          .from("materials")
          .update({ stock: Number(mat.stock) - deltaQty })
          .eq("id", id);
        await supabase.from("material_transactions").insert({
          material_id: id,
          transaction_type:
            deltaQty > 0 ? "Order Increase" : "Order Decrease (Refund)",
          quantity: -deltaQty,
          reason: `Order Edit: ${newCustomerName}`,
        });
      }
    };

    if (boxDelta !== 0) {
      await supabase
        .from("finished_products")
        .update({ stock: Number(fp.stock) - bulkVolumeDelta })
        .eq("id", fp.id);
      await supabase
        .from("containers")
        .update({ stock: Number(targetContainer!.stock) - pieceDelta })
        .eq("id", actualInventoryContainerId);
      await supabase.from("container_transactions").insert({
        container_id: actualInventoryContainerId,
        transaction_type:
          boxDelta > 0 ? "Order Increase" : "Order Decrease (Refund)",
        quantity: -pieceDelta,
        reason: `Order Edit: ${newCustomerName}`,
      });
      if (container.box_id) await adjustMaterial(container.box_id, boxDelta);
      if (container.cap_id) await adjustMaterial(container.cap_id, capDelta);
    }

    // Handle Stickers safely
    if (order.sticker_id !== newStickerId) {
      if (order.sticker_id)
        await adjustMaterial(order.sticker_id, -oldStickers); // Full refund old
      if (newStickerId) await adjustMaterial(newStickerId, newTotalStickers); // Full deduct new
    } else if (order.sticker_id) {
      const stickerDelta = newTotalStickers - oldStickers;
      await adjustMaterial(order.sticker_id, stickerDelta); // Just adjust difference
    }

    // 3. RECALCULATE PROFIT
    const newTotalAmount = newTotalPieces * newRate;
    const newBulkVolume = getConvertedVolume(
      newTotalPieces,
      container.capacity_per_piece,
      container.capacity_unit,
      fp.unit,
    );

    const boxCost = container.box_id
      ? newBoxesQty *
        Number(
          materials?.find((m) => m.id === container.box_id)?.cost_per_unit || 0,
        )
      : 0;
    const capCost = container.cap_id
      ? newTotalPieces *
        (container.cap_quantity || 0) *
        Number(
          materials?.find((m) => m.id === container.cap_id)?.cost_per_unit || 0,
        )
      : 0;
    const stickerCost = newStickerId
      ? newTotalStickers *
        Number(
          materials?.find((m) => m.id === newStickerId)?.cost_per_unit || 0,
        )
      : 0;

    const newOilCost = newBulkVolume * Number(fp.cost_per_unit || 0);
    const newBottleCost =
      newTotalPieces * Number(container.cost_per_piece || 0);
    const newTotalCostOfGoods =
      newOilCost + newBottleCost + boxCost + stickerCost + capCost;
    const recalculatedProfit = newTotalAmount - newTotalCostOfGoods;

    // 4. UPDATE ORDER
    await supabase
      .from("orders")
      .update({
        customer_name: newCustomerName,
        boxes_quantity: newBoxesQty,
        rate_per_piece: newRate,
        total_amount: newTotalAmount,
        outstanding_amount: newTotalAmount,
        calculated_profit: recalculatedProfit,
        sticker_id: newStickerId,
        sticker_quantity: newStickerQty,
      })
      .eq("id", orderId);

    const oldDescription = `Sales Order - ${order.customer_name} (${order.boxes_quantity} Cartons of ${fp.product_name})`;
    const newDescription = `Sales Order - ${newCustomerName} (${newBoxesQty} Cartons of ${fp.product_name})`;
    const newRatePerBox = newRate * container.pieces_per_box;

    await supabase
      .from("accounting_entries")
      .update({
        amount: newTotalAmount,
        quantity: newBoxesQty,
        rate: newRatePerBox,
        description: newDescription,
        profit: recalculatedProfit,
      })
      .eq("description", oldDescription);

    revalidatePath("/", "layout");
  } catch (error: any) {
    throw new Error(error.message || "Failed to edit order.");
  }
}

export async function deleteOrderAction(formData: FormData) {
  const orderId = formData.get("id") as string;
  if (!orderId) throw new Error("Order ID is required");

  const supabase = await createClient();

  try {
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
    if (!order) throw new Error("Order not found");

    const { data: container } = await supabase
      .from("containers")
      .select("*")
      .eq("id", order.container_id)
      .single();
    const { data: fp } = await supabase
      .from("finished_products")
      .select("*")
      .eq("id", order.finished_product_id)
      .single();

    if (container && fp) {
      const total_pieces = order.boxes_quantity * container.pieces_per_box;
      const actualInventoryContainerId =
        container.base_container_id || container.id;
      const { data: targetContainer } = await supabase
        .from("containers")
        .select("stock")
        .eq("id", actualInventoryContainerId)
        .single();

      const bulkVolumeToRefund = getConvertedVolume(
        total_pieces,
        container.capacity_per_piece,
        container.capacity_unit,
        fp.unit,
      );

      const reqBoxes = order.boxes_quantity;
      const reqCaps = total_pieces * (container.cap_quantity || 0);
      const reqStickers = total_pieces * (order.sticker_quantity || 0);

      await supabase
        .from("finished_products")
        .update({ stock: Number(fp.stock) + bulkVolumeToRefund })
        .eq("id", fp.id);
      await supabase
        .from("containers")
        .update({ stock: Number(targetContainer!.stock) + total_pieces })
        .eq("id", actualInventoryContainerId);

      await supabase.from("container_transactions").insert({
        container_id: actualInventoryContainerId,
        transaction_type: "Order Deleted",
        quantity: Math.abs(total_pieces),
        reason: `Order Deleted: ${order.customer_name}`,
      });

      const refundMaterial = async (id: string, qty: number) => {
        if (!id || qty <= 0) return;
        const { data: mat } = await supabase
          .from("materials")
          .select("stock")
          .eq("id", id)
          .single();
        if (mat) {
          await supabase
            .from("materials")
            .update({ stock: Number(mat.stock) + qty })
            .eq("id", id);
          await supabase.from("material_transactions").insert({
            material_id: id,
            transaction_type: "Order Deleted",
            quantity: Math.abs(qty),
            reason: `Order Deleted: ${order.customer_name}`,
          });
        }
      };

      if (container.box_id) await refundMaterial(container.box_id, reqBoxes);
      if (container.cap_id) await refundMaterial(container.cap_id, reqCaps);
      if (order.sticker_id) await refundMaterial(order.sticker_id, reqStickers);

      const descriptionMatch = `Sales Order - ${order.customer_name} (${order.boxes_quantity} Cartons of ${fp.product_name})`;
      await supabase
        .from("accounting_entries")
        .delete()
        .eq("description", descriptionMatch);
    }

    await supabase.from("orders").delete().eq("id", orderId);
    revalidatePath("/", "layout");
  } catch (error: any) {
    throw new Error(`Failed to delete order: ${error.message}`);
  }
}
