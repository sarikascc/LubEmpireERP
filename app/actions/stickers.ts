"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addStickerAction(formData: FormData) {
  const name = formData.get("name") as string;
  const supabase = await createClient();

  const { error } = await supabase.from("materials").insert({
    name,
    type: "Sticker",
    unit: "PCS",
    stock: 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/materials/stickers");
}

export async function editStickerAction(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const supabase = await createClient();

  const { error } = await supabase
    .from("materials")
    .update({ name })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/materials/stickers");
}

export async function deleteStickerAction(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();

  // 1. Clear transaction history
  await supabase.from("material_transactions").delete().eq("material_id", id);

  // 2. Clear production usage
  await supabase
    .from("production_material_consumption")
    .delete()
    .eq("raw_material_id", id);

  // 3. Delete the Sticker
  const { error } = await supabase.from("materials").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/materials/stickers");
}
export async function purchaseStickerAction(formData: FormData) {
  const material_id = formData.get("material_id") as string;
  const quantity = Number(formData.get("quantity"));
  const rate = Number(formData.get("rate"));
  // Added the fallback here so it never crashes!
  const supplier = (formData.get("supplier") as string) || "Unknown Supplier";
  const total_cost = quantity * rate;

  const supabase = await createClient();

  // 1. Fetch current sticker to get existing stock
  const { data: sticker, error: fetchError } = await supabase
    .from("materials")
    .select("name, stock")
    .eq("id", material_id)
    .single();

  if (fetchError || !sticker) throw new Error("Sticker not found");

  // 2. Log transaction
  const { error: stockError } = await supabase
    .from("material_transactions")
    .insert({
      material_id,
      transaction_type: "Purchase",
      quantity,
      rate,
      reason: supplier,
    });

  if (stockError) throw new Error("Failed to update stock");

  // 3. Update ACTUAL stock
  const newStock = Number(sticker.stock || 0) + quantity;
  await supabase
    .from("materials")
    .update({ stock: newStock })
    .eq("id", material_id);

  // 4. Expense Entry (FIXED DATABASE TARGET)
  const { error: accError } = await supabase.from("accounting_entries").insert({
    entry_type: "Expense", // Changed to match your DB
    amount: total_cost, // Removed the category line
    description: `Purchase - ${supplier} (${quantity} Stickers of ${sticker.name})`,
  });

  if (accError) {
    console.error("Accounting Insert Failed:", accError.message);
  }

  revalidatePath("/materials/stickers");
}
export async function adjustStickerAction(formData: FormData) {
  const material_id = formData.get("material_id") as string;
  const quantity = Number(formData.get("quantity"));
  const adjustment_type = formData.get("adjustment_type") as string;
  const rawReason = formData.get("reason") as string;
  const reason =
    rawReason && rawReason.trim() !== "" ? rawReason : "Manual Adjustment";

  // Translate frontend string to the allowed database string
  const db_transaction_type =
    adjustment_type === "Add Quantity" ? "Manual Add" : "Manual Remove";

  const supabase = await createClient();

  const { data: sticker, error: fetchError } = await supabase
    .from("materials")
    .select("stock")
    .eq("id", material_id)
    .single();
  if (fetchError || !sticker) throw new Error("Sticker not found");

  let currentStock = Number(sticker.stock || 0);
  const isRemoving = adjustment_type === "Remove Quantity";

  // BACKEND SAFETY CHECK
  if (isRemoving && quantity > currentStock) {
    throw new Error(
      `Cannot remove ${quantity}. Only ${currentStock} in stock.`,
    );
  }

  const actualQuantity = isRemoving ? -Math.abs(quantity) : Math.abs(quantity);
  const newStock = currentStock + actualQuantity;

  const { error } = await supabase.from("material_transactions").insert({
    material_id,
    transaction_type: db_transaction_type, // Using translated string
    quantity: actualQuantity,
    rate: 0,
    reason,
  });

  // Exact error catching
  if (error) throw new Error(`Database Error: ${error.message}`);

  await supabase
    .from("materials")
    .update({ stock: newStock })
    .eq("id", material_id);

  revalidatePath("/materials/stickers");
}
