"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createOrderAction(formData: FormData) {
  // 1. Extract and Validate Form Data
  const customer_name = formData.get("customer_name") as string;
  const finished_product_id = formData.get("finished_product_id") as string;
  const container_id = formData.get("container_id") as string;
  const boxes_quantity = Number(formData.get("boxes_quantity"));
  const rate_per_piece = Number(formData.get("rate_per_piece"));

  const supabase = await createClient();

  // 2. Fetch Configuration Data (Container & Oil)
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
    throw new Error("Missing required data to process this order.");
  }

  // 3. Calculate Totals
  const total_pieces = boxes_quantity * container.pieces_per_box;
  const total_amount = total_pieces * rate_per_piece;

  // 4. Volume Conversion (Oil Deduction Calculation)
  let bulkVolumeToDeduct = Number(container.capacity_per_piece) * total_pieces;
  if (container.capacity_unit === "ml" && fp.unit === "Ltr")
    bulkVolumeToDeduct /= 1000;
  if (container.capacity_unit === "gm" && fp.unit === "KG")
    bulkVolumeToDeduct /= 1000;

  // 5. Secondary Material Requirements
  const reqBoxes = boxes_quantity;
  const reqStickers = total_pieces * (container.sticker_quantity || 0);
  const reqCaps = total_pieces * (container.cap_quantity || 0);

  // 6. INVENTORY SAFETY CHECKS
  // Check Oil Stock
  if (Number(fp.stock) < bulkVolumeToDeduct) {
    throw new Error(
      `Insufficient Oil! Need ${bulkVolumeToDeduct}${fp.unit}, have ${fp.stock}${fp.unit}.`,
    );
  }
  // Check Physical Bottle/Bucket Stock
  if (Number(container.stock) < total_pieces) {
    throw new Error(
      `Insufficient Empty ${container.name}! Need ${total_pieces} PCS, have ${container.stock} PCS.`,
    );
  }

  // Check Secondary Materials (Boxes, Stickers, Caps)
  const materialIds = [
    container.box_id,
    container.sticker_id,
    container.cap_id,
  ].filter(Boolean);
  const { data: materials } = await supabase
    .from("materials")
    .select("id, name, stock")
    .in("id", materialIds);

  const boxStock = materials?.find((m) => m.id === container.box_id);
  const stickerStock = materials?.find((m) => m.id === container.sticker_id);
  const capStock = materials?.find((m) => m.id === container.cap_id);

  if (container.box_id && (!boxStock || boxStock.stock < reqBoxes))
    throw new Error(`Insufficient Boxes!`);
  if (
    container.sticker_id &&
    (!stickerStock || stickerStock.stock < reqStickers)
  )
    throw new Error(`Insufficient Stickers!`);
  if (container.cap_id && (!capStock || capStock.stock < reqCaps))
    throw new Error(`Insufficient Caps!`);

  // 7. EXECUTE DEDUCTIONS

  // A. Deduct Oil
  await supabase
    .from("finished_products")
    .update({ stock: Number(fp.stock) - bulkVolumeToDeduct })
    .eq("id", fp.id);

  // B. Deduct Empty Bottles/Buckets & Log Transaction
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

  // C. Deduct Secondary Materials Helper
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

  // 8. CREATE THE SALES ORDER
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_name,
      finished_product_id,
      container_id, // This matches your DB column name
      boxes_quantity,
      rate_per_piece,
      total_amount,
      outstanding_amount: total_amount,
    })
    .select()
    .single();

  if (orderError) throw new Error(`Order Error: ${orderError.message}`);

  // 9. LOG ACCOUNTING ENTRY WITH QTY & RATE (NEW UPDATES HERE)
  const rate_per_box = rate_per_piece * container.pieces_per_box;

  await supabase.from("accounting_entries").insert({
    entry_type: "Income",
    amount: total_amount,
    quantity: boxes_quantity, // ADDED
    rate: rate_per_box, // ADDED
    unit: "Boxes", // ADDED
    description: `Sales Order - ${customer_name} (${boxes_quantity} Cartons of ${fp.product_name})`,
  });

  // 10. Refresh all relevant paths (UPDATED TO FIX UI REFRESH)
  revalidatePath("/", "layout");
}
