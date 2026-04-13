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

  // 1. Delete all transaction history
  await supabase.from("material_transactions").delete().eq("material_id", id);

  // 2. Delete any production consumption records
  await supabase
    .from("production_material_consumption")
    .delete()
    .eq("raw_material_id", id);

  // 3. Force delete the Raw Material
  const { error } = await supabase.from("materials").delete().eq("id", id);

  if (error) throw new Error(error.message);
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
  const rate = Number(formData.get("rate")); // This is the new purchase price
  const supplier = formData.get("supplier") as string;
  const total_cost = quantity * rate;

  const supabase = await createClient();

  // Step A: Fetch current stock AND current average cost
  const { data: material, error: fetchError } = await supabase
    .from("materials")
    .select("name, unit, stock, cost_per_unit")
    .eq("id", material_id)
    .single();

  if (fetchError || !material) throw new Error("Material not found");

  let currentStock = Number(material.stock || 0);
  let currentAvgCost = Number(material.cost_per_unit || 0);

  const currentTotalValue = currentStock * currentAvgCost; // Value of warehouse
  const newPurchaseValue = quantity * rate; // Value of new truck arrival

  const newStock = currentStock + quantity;
  // Blend the costs together!
  const newAvgCost =
    newStock > 0 ? (currentTotalValue + newPurchaseValue) / newStock : 0;

  // Step B: Update ACTUAL stock AND new average cost
  const { error: updateError } = await supabase
    .from("materials")
    .update({
      stock: newStock,
      cost_per_unit: newAvgCost, // <-- SAVING THE NEW BLENDED COST
    })
    .eq("id", material_id);

  if (updateError) throw new Error("Failed to update material stock");

  // Step C: Log the transaction
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

  // Step D: Expense Entry
  const { error: accError } = await supabase.from("accounting_entries").insert({
    entry_type: "Expense",
    amount: total_cost,
    quantity: quantity,
    rate: rate,
    unit: material.unit,
    description: `Purchase - ${supplier} (${quantity} ${material.unit} of ${material.name})`,
  });

  if (accError) console.error("Accounting Insert Failed:", accError.message);

  revalidatePath("/materials/raw-materials");
}

// 5. Adjust Stock
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
    transaction_type: db_transaction_type,
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

// 🔥 NEW: 6. Edit Existing Purchase (With Moving Average Recalculation)
export async function editRawMaterialPurchaseAction(formData: FormData) {
  const transaction_id = formData.get("transaction_id") as string;
  const new_quantity = Number(formData.get("quantity"));
  const new_rate = Number(formData.get("rate"));
  const new_supplier = formData.get("supplier") as string;

  const supabase = await createClient();

  // 1. Fetch the exact old transaction details (including material name/unit for the ledger)
  const { data: txn, error: txnError } = await supabase
    .from("material_transactions")
    .select("*, materials(name, unit)")
    .eq("id", transaction_id)
    .single();

  if (txnError || !txn) throw new Error("Transaction not found.");

  const old_quantity = Number(txn.quantity);
  const old_rate = Number(txn.rate);
  const material_id = txn.material_id;

  // Safe extraction for TS
  const matData = txn.materials as any;
  const material_name = matData?.name || "Unknown Material";
  const material_unit = matData?.unit || "Unit";

  // 2. Fetch the current material stock and average cost
  const { data: material } = await supabase
    .from("materials")
    .select("stock, cost_per_unit")
    .eq("id", material_id)
    .single();

  let currentStock = Number(material?.stock || 0);
  let currentAvgCost = Number(material?.cost_per_unit || 0);

  // 3. REVERSE the old purchase out of the warehouse value
  const currentTotalValue = currentStock * currentAvgCost;
  const oldPurchaseValue = old_quantity * old_rate;

  let tempStock = currentStock - old_quantity;
  let tempTotalValue = currentTotalValue - oldPurchaseValue;

  // Prevent floating point weirdness from dropping it below absolute zero
  if (tempStock < 0) tempStock = 0;
  if (tempTotalValue < 0) tempTotalValue = 0;

  // 4. APPLY the newly edited purchase values
  const newPurchaseValue = new_quantity * new_rate;
  const newStock = tempStock + new_quantity;

  // Calculate the new blended average cost!
  const newAvgCost =
    newStock > 0 ? (tempTotalValue + newPurchaseValue) / newStock : 0;

  // 5. Update Database: Materials Table
  await supabase
    .from("materials")
    .update({ stock: newStock, cost_per_unit: newAvgCost })
    .eq("id", material_id);

  // 6. Update Database: Material Transactions Table
  await supabase
    .from("material_transactions")
    .update({
      quantity: new_quantity,
      rate: new_rate,
      reason: new_supplier,
    })
    .eq("id", transaction_id);

  // 7. Update Database: Accounting Ledger
  const old_desc = `Purchase - ${txn.reason} (${old_quantity} ${material_unit} of ${material_name})`;
  const new_desc = `Purchase - ${new_supplier} (${new_quantity} ${material_unit} of ${material_name})`;
  const new_amount = new_quantity * new_rate;

  await supabase
    .from("accounting_entries")
    .update({
      amount: new_amount,
      quantity: new_quantity,
      rate: new_rate,
      description: new_desc,
    })
    .eq("description", old_desc);

  revalidatePath("/materials/raw-materials");
}
