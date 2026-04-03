"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addCapAction(formData: FormData) {
  const name = formData.get("name") as string;
  const supabase = await createClient();

  const { error } = await supabase.from("materials").insert({
    name,
    type: "Cap",
    unit: "PCS",
    stock: 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/materials/caps");
}

export async function editCapAction(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const supabase = await createClient();

  const { error } = await supabase
    .from("materials")
    .update({ name })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/materials/caps");
}

export async function deleteCapAction(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();

  // 1. Delete all transaction history
  await supabase.from("material_transactions").delete().eq("material_id", id);

  // 2. Delete any production consumption records
  await supabase
    .from("production_material_consumption")
    .delete()
    .eq("raw_material_id", id);

  // 3. Force delete the Cap itself (Postgres will auto-unlink it from containers)
  const { error } = await supabase.from("materials").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/materials/caps");
}
export async function purchaseCapAction(formData: FormData) {
  const material_id = formData.get("material_id") as string;
  const quantity = Number(formData.get("quantity"));
  const rate = Number(formData.get("rate"));
  const supplier = (formData.get("supplier") as string) || "Unknown Supplier";
  const total_cost = quantity * rate;

  const supabase = await createClient();

  // 1. Fetch current cap to get existing stock AND average cost
  const { data: cap, error: fetchError } = await supabase
    .from("materials")
    .select("name, stock, cost_per_unit") // <-- ADDED cost_per_unit
    .eq("id", material_id)
    .single();

  if (fetchError || !cap) throw new Error("Cap not found");

  // 🌟 THE MOVING AVERAGE MATH 🌟
  let currentStock = Number(cap.stock || 0);
  let currentAvgCost = Number(cap.cost_per_unit || 0);

  const currentTotalValue = currentStock * currentAvgCost;
  const newPurchaseValue = quantity * rate;

  const newStock = currentStock + quantity;
  const newAvgCost =
    newStock > 0 ? (currentTotalValue + newPurchaseValue) / newStock : 0;

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

  // 3. Update ACTUAL stock AND new average cost
  await supabase
    .from("materials")
    .update({
      stock: newStock,
      cost_per_unit: newAvgCost, // <-- SAVING NEW BLENDED COST
    })
    .eq("id", material_id);

  // 4. Expense Entry
  const { error: accError } = await supabase.from("accounting_entries").insert({
    entry_type: "Expense",
    amount: total_cost,
    description: `Purchase - ${supplier} (${quantity} Caps of ${cap.name})`,
  });

  if (accError) {
    console.error("Accounting Insert Failed:", accError.message);
  }

  revalidatePath("/materials/caps");
}

export async function adjustCapAction(formData: FormData) {
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

  const { data: cap, error: fetchError } = await supabase
    .from("materials")
    .select("stock")
    .eq("id", material_id)
    .single();
  if (fetchError || !cap) throw new Error("Cap not found");

  let currentStock = Number(cap.stock || 0);
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

  revalidatePath("/materials/caps");
}
