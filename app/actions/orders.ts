"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createOrderAction(formData: FormData) {
  const customer_name = formData.get("customer_name") as string;
  const finished_product_id = formData.get("finished_product_id") as string;
  const container_id = formData.get("container_id") as string;
  const boxes_quantity = Number(formData.get("boxes_quantity"));
  const rate_per_piece = Number(formData.get("rate_per_piece"));

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
  const reqStickers = total_pieces * (container.sticker_quantity || 0);
  const reqCaps = total_pieces * (container.cap_quantity || 0);

  if (Number(fp.stock) < bulkVolumeToDeduct) {
    return {
      error: `Insufficient Oil! Need ${bulkVolumeToDeduct}${fp.unit}, have ${fp.stock}${fp.unit}.`,
    };
  }
  if (Number(container.stock) < total_pieces) {
    return {
      error: `Insufficient Empty ${container.name}! Need ${total_pieces} PCS, have ${container.stock} PCS.`,
    };
  }

  const materialIds = [
    container.box_id,
    container.sticker_id,
    container.cap_id,
  ].filter(Boolean);

  // 🔥 FIX 1: Fetch cost_per_unit for the materials!
  const { data: materials } = await supabase
    .from("materials")
    .select("id, name, stock, cost_per_unit")
    .in("id", materialIds);

  const boxStock = materials?.find((m) => m.id === container.box_id);
  const stickerStock = materials?.find((m) => m.id === container.sticker_id);
  const capStock = materials?.find((m) => m.id === container.cap_id);

  if (container.box_id && (!boxStock || boxStock.stock < reqBoxes))
    return { error: `Insufficient Boxes!` };
  if (
    container.sticker_id &&
    (!stickerStock || stickerStock.stock < reqStickers)
  )
    return { error: `Insufficient Stickers!` };
  if (container.cap_id && (!capStock || capStock.stock < reqCaps))
    return { error: `Insufficient Caps!` };

  // 🔥 FIX 2: SERVER-SIDE PROFIT CALCULATION (INCLUDING ALL PACKAGING)
  const oilCost = bulkVolumeToDeduct * Number(fp.cost_per_unit || 0);
  const bottleCost = total_pieces * Number(container.cost_per_piece || 0);
  const boxCost = container.box_id
    ? reqBoxes * Number(boxStock?.cost_per_unit || 0)
    : 0;
  const stickerCost = container.sticker_id
    ? reqStickers * Number(stickerStock?.cost_per_unit || 0)
    : 0;
  const capCost = container.cap_id
    ? reqCaps * Number(capStock?.cost_per_unit || 0)
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
    .update({ stock: Number(container.stock) - total_pieces })
    .eq("id", container.id);

  await supabase.from("container_transactions").insert({
    container_id: container.id,
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
  if (container.sticker_id)
    await deductMaterial(
      container.sticker_id,
      reqStickers,
      stickerStock!.stock,
    );
  if (container.cap_id)
    await deductMaterial(container.cap_id, reqCaps, capStock!.stock);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_name,
      finished_product_id,
      container_id,
      boxes_quantity,
      rate_per_piece,
      total_amount,
      outstanding_amount: total_amount,
    })
    .select()
    .single();

  if (orderError) return { error: `Order Error: ${orderError.message}` };

  const rate_per_box = rate_per_piece * container.pieces_per_box;

  await supabase.from("accounting_entries").insert({
    entry_type: "Income",
    amount: total_amount,
    quantity: boxes_quantity,
    rate: rate_per_box,
    unit: "Boxes",
    description: `Sales Order - ${customer_name} (${boxes_quantity} Cartons of ${fp.product_name})`,
    profit: realCalculatedProfit, // 🔥 FIX 3: SAVING THE REAL PROFIT
  });

  revalidatePath("/", "layout");
  return { success: true };
}

// ==========================================
// EDIT ORDER ACTION
// ==========================================
export async function editOrderAction(formData: FormData) {
  const orderId = formData.get("id") as string;
  const newCustomerName = formData.get("customer_name") as string;
  const newBoxesQty = Number(formData.get("boxes_quantity"));
  const newRate = Number(formData.get("rate_per_piece"));

  if (!orderId || !newCustomerName || newBoxesQty <= 0 || newRate <= 0) {
    throw new Error("Invalid input data.");
  }

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

    const boxDelta = newBoxesQty - order.boxes_quantity;
    const pieceDelta = boxDelta * container.pieces_per_box;

    let bulkVolumeDelta = Number(container.capacity_per_piece) * pieceDelta;
    if (container.capacity_unit === "ml" && fp.unit === "Ltr")
      bulkVolumeDelta /= 1000;
    if (container.capacity_unit === "gm" && fp.unit === "KG")
      bulkVolumeDelta /= 1000;

    const stickerDelta = pieceDelta * (container.sticker_quantity || 0);
    const capDelta = pieceDelta * (container.cap_quantity || 0);

    const materialIds = [
      container.box_id,
      container.sticker_id,
      container.cap_id,
    ].filter(Boolean);

    // 🔥 FIX 4: Fetch cost_per_unit in edit action too
    const { data: materials } = await supabase
      .from("materials")
      .select("id, stock, cost_per_unit")
      .in("id", materialIds);

    const boxStock = materials?.find((m) => m.id === container.box_id);
    const stickerStock = materials?.find((m) => m.id === container.sticker_id);
    const capStock = materials?.find((m) => m.id === container.cap_id);

    if (boxDelta > 0) {
      if (Number(fp.stock) < bulkVolumeDelta)
        throw new Error(
          `Insufficient Oil! Need ${bulkVolumeDelta}${fp.unit} more.`,
        );
      if (Number(container.stock) < pieceDelta)
        throw new Error(
          `Insufficient Empty Containers! Need ${pieceDelta} more.`,
        );
      if (container.box_id && (!boxStock || boxStock.stock < boxDelta))
        throw new Error("Insufficient Boxes!");
      if (
        container.sticker_id &&
        (!stickerStock || stickerStock.stock < stickerDelta)
      )
        throw new Error("Insufficient Stickers!");
      if (container.cap_id && (!capStock || capStock.stock < capDelta))
        throw new Error("Insufficient Caps!");
    }

    if (boxDelta !== 0) {
      await supabase
        .from("finished_products")
        .update({ stock: Number(fp.stock) - bulkVolumeDelta })
        .eq("id", fp.id);
      await supabase
        .from("containers")
        .update({ stock: Number(container.stock) - pieceDelta })
        .eq("id", container.id);

      await supabase.from("container_transactions").insert({
        container_id: container.id,
        transaction_type:
          boxDelta > 0 ? "Order Increase" : "Order Decrease (Refund)",
        quantity: -pieceDelta,
        reason: `Order Edit: ${newCustomerName}`,
      });

      const adjustMaterial = async (id: string, deltaQty: number) => {
        if (!id || deltaQty === 0) return;
        const mat = materials?.find((m) => m.id === id);
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

      if (container.box_id) await adjustMaterial(container.box_id, boxDelta);
      if (container.sticker_id)
        await adjustMaterial(container.sticker_id, stickerDelta);
      if (container.cap_id) await adjustMaterial(container.cap_id, capDelta);
    }

    const newTotalPieces = newBoxesQty * container.pieces_per_box;
    const newTotalAmount = newTotalPieces * newRate;

    await supabase
      .from("orders")
      .update({
        customer_name: newCustomerName,
        boxes_quantity: newBoxesQty,
        rate_per_piece: newRate,
        total_amount: newTotalAmount,
        outstanding_amount: newTotalAmount,
      })
      .eq("id", orderId);

    // 🔥 FIX 5: Full Profit Calculation for Edits
    let newBulkVolume =
      Number(container.capacity_per_piece || 0) * newTotalPieces;
    if (container.capacity_unit === "ml" && fp.unit === "Ltr")
      newBulkVolume /= 1000;
    if (container.capacity_unit === "gm" && fp.unit === "KG")
      newBulkVolume /= 1000;

    const newReqBoxes = newBoxesQty;
    const newReqStickers = newTotalPieces * (container.sticker_quantity || 0);
    const newReqCaps = newTotalPieces * (container.cap_quantity || 0);

    const newOilCost = newBulkVolume * Number(fp.cost_per_unit || 0);
    const newBottleCost =
      newTotalPieces * Number(container.cost_per_piece || 0);
    const newBoxCost = container.box_id
      ? newReqBoxes * Number(boxStock?.cost_per_unit || 0)
      : 0;
    const newStickerCost = container.sticker_id
      ? newReqStickers * Number(stickerStock?.cost_per_unit || 0)
      : 0;
    const newCapCost = container.cap_id
      ? newReqCaps * Number(capStock?.cost_per_unit || 0)
      : 0;

    const newTotalCostOfGoods =
      newOilCost + newBottleCost + newBoxCost + newStickerCost + newCapCost;
    const recalculatedProfit = newTotalAmount - newTotalCostOfGoods;

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
        profit: recalculatedProfit, // 🔥 FIX 6: Saving correct edit profit
      })
      .eq("description", oldDescription);

    revalidatePath("/", "layout");
  } catch (error: any) {
    throw new Error(error.message || "Failed to edit order.");
  }
}

// ==========================================
// DELETE ORDER ACTION
// ==========================================
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

      let bulkVolumeToRefund =
        Number(container.capacity_per_piece) * total_pieces;
      if (container.capacity_unit === "ml" && fp.unit === "Ltr")
        bulkVolumeToRefund /= 1000;
      if (container.capacity_unit === "gm" && fp.unit === "KG")
        bulkVolumeToRefund /= 1000;

      const reqBoxes = order.boxes_quantity;
      const reqStickers = total_pieces * (container.sticker_quantity || 0);
      const reqCaps = total_pieces * (container.cap_quantity || 0);

      await supabase
        .from("finished_products")
        .update({ stock: Number(fp.stock) + bulkVolumeToRefund })
        .eq("id", fp.id);
      await supabase
        .from("containers")
        .update({ stock: Number(container.stock) + total_pieces })
        .eq("id", container.id);

      await supabase.from("container_transactions").insert({
        container_id: container.id,
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
      if (container.sticker_id)
        await refundMaterial(container.sticker_id, reqStickers);
      if (container.cap_id) await refundMaterial(container.cap_id, reqCaps);

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
