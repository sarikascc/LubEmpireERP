"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createOrderAction(formData: FormData) {
  const customer_name = formData.get("customer_name") as string;
  const finished_product_id = formData.get("finished_product_id") as string;
  const container_id = formData.get("container_id") as string;
  const boxes_quantity = Number(formData.get("boxes_quantity"));
  const rate_per_piece = Number(formData.get("rate_per_piece"));

  // Catch the sticker details directly from the Order form
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

  const total_pieces = boxes_quantity * container.pieces_per_box;
  const total_amount = total_pieces * rate_per_piece;

  let bulkVolumeToDeduct = Number(container.capacity_per_piece) * total_pieces;
  if (container.capacity_unit === "ml" && fp.unit === "Ltr")
    bulkVolumeToDeduct /= 1000;
  if (container.capacity_unit === "gm" && fp.unit === "KG")
    bulkVolumeToDeduct /= 1000;

  const reqBoxes = boxes_quantity;
  const reqCaps = total_pieces * (container.cap_quantity || 0);

  // Calculate required stickers based on the new Order input
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

  // Combine container materials and the new order sticker
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

  // Insert order with sticker info
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
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function editOrderAction(formData: FormData) {
  const orderId = formData.get("id") as string;
  const newCustomerName = formData.get("customer_name") as string;
  const newBoxesQty = Number(formData.get("boxes_quantity"));
  const newRate = Number(formData.get("rate_per_piece"));

  // Catch sticker updates
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

    // 1. REFUND OLD MATERIALS
    const oldPieces = order.boxes_quantity * container.pieces_per_box;
    // We now look at the order for sticker quantity, NOT the container!
    const oldStickers = oldPieces * (order.sticker_quantity || 0);
    const oldCaps = oldPieces * (container.cap_quantity || 0);

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

    // Calculate Box and Cap deltas normally
    const boxDelta = newBoxesQty - order.boxes_quantity;
    const pieceDelta = boxDelta * container.pieces_per_box;
    const capDelta = pieceDelta * (container.cap_quantity || 0);

    let bulkVolumeDelta = Number(container.capacity_per_piece) * pieceDelta;
    if (container.capacity_unit === "ml" && fp.unit === "Ltr")
      bulkVolumeDelta /= 1000;
    if (container.capacity_unit === "gm" && fp.unit === "KG")
      bulkVolumeDelta /= 1000;

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

    // 2. HANDLE STICKER DELTAS (Since sticker_id might have changed entirely)
    const newTotalPieces = newBoxesQty * container.pieces_per_box;
    const newTotalStickers = newTotalPieces * newStickerQty;

    if (order.sticker_id !== newStickerId) {
      // Refund old sticker completely
      if (order.sticker_id)
        await adjustMaterial(order.sticker_id, -oldStickers);
      // Deduct new sticker completely
      if (newStickerId) await adjustMaterial(newStickerId, newTotalStickers);
    } else if (order.sticker_id) {
      // Just adjust the delta if it's the same sticker
      const stickerDelta = newTotalStickers - oldStickers;
      await adjustMaterial(order.sticker_id, stickerDelta);
    }

    // 3. RECALCULATE PROFIT
    const newTotalAmount = newTotalPieces * newRate;

    let newBulkVolume =
      Number(container.capacity_per_piece || 0) * newTotalPieces;
    if (container.capacity_unit === "ml" && fp.unit === "Ltr")
      newBulkVolume /= 1000;
    if (container.capacity_unit === "gm" && fp.unit === "KG")
      newBulkVolume /= 1000;

    const { data: materials } = await supabase
      .from("materials")
      .select("id, cost_per_unit")
      .in(
        "id",
        [container.box_id, container.cap_id, newStickerId].filter(Boolean),
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

      let bulkVolumeToRefund =
        Number(container.capacity_per_piece) * total_pieces;
      if (container.capacity_unit === "ml" && fp.unit === "Ltr")
        bulkVolumeToRefund /= 1000;
      if (container.capacity_unit === "gm" && fp.unit === "KG")
        bulkVolumeToRefund /= 1000;

      const reqBoxes = order.boxes_quantity;
      const reqCaps = total_pieces * (container.cap_quantity || 0);
      // 🔥 We now look at the order for sticker quantity, NOT the container!
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
