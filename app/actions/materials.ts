"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. Add New Material
export async function addRawMaterial(formData: FormData) {
  const name = formData.get("name") as string;
  const unit = formData.get("unit") as string;

  const supabase = await createClient();

  await supabase.from("materials").insert({
    name,
    type: "Raw Material",
    unit,
    stock: 0, // Starts at 0
  });

  revalidatePath("/materials/raw-materials");
}

// 2. Delete Material
export async function deleteMaterialAction(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();
  await supabase.from("materials").delete().eq("id", id);
  revalidatePath("/materials/raw-materials");
}

// 3. Edit Material Name/Unit
export async function editRawMaterialAction(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const unit = formData.get("unit") as string;

  const supabase = await createClient();
  await supabase
    .from("materials")
    .update({
      name,
      unit,
    })
    .eq("id", id);

  revalidatePath("/materials/raw-materials");
}

// 4. Purchase Material (Updates Stock & Logs Expense)
export async function purchaseRawMaterialAction(formData: FormData) {
  const material_id = formData.get("material_id") as string;
  const quantity = Number(formData.get("quantity"));
  const rate = Number(formData.get("rate"));
  const supplier = formData.get("supplier") as string;
  const total_cost = quantity * rate;

  const supabase = await createClient();

  // Step A: Fetch the current material data to get the existing stock
  const { data: material, error: fetchError } = await supabase
    .from("materials")
    .select("name, unit, stock")
    .eq("id", material_id)
    .single();

  if (fetchError || !material) throw new Error("Material not found");

  // Step B: Log the transaction
  const { error: stockError } = await supabase
    .from("material_transactions")
    .insert({
      material_id,
      transaction_type: "Purchase",
      quantity,
      rate,
      reason: supplier,
    });

  if (stockError) throw new Error("Failed to log transaction");

  // Step C: Calculate and update the ACTUAL stock in the materials table
  const newStock = Number(material.stock || 0) + quantity;
  const { error: updateError } = await supabase
    .from("materials")
    .update({ stock: newStock })
    .eq("id", material_id);

  if (updateError) throw new Error("Failed to update material stock");

  // Step D: Automatically create the Expense Entry
  // TARGETING THE CORRECT TABLE AND COLUMNS NOW!
  const { error: accError } = await supabase.from("accounting_entries").insert({
    entry_type: "Expense",
    amount: total_cost,
    description: `Purchase - ${supplier} (${quantity} ${material.unit} of ${material.name})`,
  });

  if (accError) {
    console.error("Accounting Insert Failed:", accError.message);
  }

  revalidatePath("/materials/raw-materials");
}
export async function adjustRawMaterialAction(formData: FormData) {
  const material_id = formData.get("material_id") as string;
  const adjustment_type = formData.get("adjustment_type") as string;
  const quantity = Number(formData.get("quantity"));
  const rawReason = formData.get("reason") as string;
  const reason =
    rawReason && rawReason.trim() !== "" ? rawReason : "Manual Adjustment";

  // Translate frontend string to the allowed database string
  const db_transaction_type =
    adjustment_type === "Add Quantity" ? "Manual Add" : "Manual Remove";

  const supabase = await createClient();

  const { data: material, error: fetchError } = await supabase
    .from("materials")
    .select("stock")
    .eq("id", material_id)
    .single();
  if (fetchError || !material) throw new Error("Material not found");

  let currentStock = Number(material.stock || 0);
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

  // Exact error catching added here!
  if (error) throw new Error(`Database Error: ${error.message}`);

  await supabase
    .from("materials")
    .update({ stock: newStock })
    .eq("id", material_id);

  revalidatePath("/materials/raw-materials");
}
