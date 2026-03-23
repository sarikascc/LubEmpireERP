"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addBoxAction(formData: FormData) {
  const name = formData.get("name") as string;
  const supabase = await createClient();

  const { error } = await supabase.from("materials").insert({
    name,
    type: "Box",
    unit: "PCS",
    stock: 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/materials/boxes");
}

export async function editBoxAction(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const supabase = await createClient();

  const { error } = await supabase
    .from("materials")
    .update({ name })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/materials/boxes");
}

export async function deleteBoxAction(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();

  await supabase.from("material_transactions").delete().eq("material_id", id);

  await supabase
    .from("production_material_consumption")
    .delete()
    .eq("raw_material_id", id);

  const { error } = await supabase.from("materials").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/materials/boxes");
}

export async function purchaseBoxAction(formData: FormData) {
  const material_id = formData.get("material_id") as string;
  const quantity = Number(formData.get("quantity"));
  const rate = Number(formData.get("rate"));

  const supplier = (formData.get("supplier") as string) || "Unknown Supplier";
  const total_cost = quantity * rate;

  const supabase = await createClient();

  const { data: box, error: fetchError } = await supabase
    .from("materials")
    .select("name, stock")
    .eq("id", material_id)
    .single();

  if (fetchError || !box) throw new Error("Box not found");

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

  const newStock = Number(box.stock || 0) + quantity;
  await supabase
    .from("materials")
    .update({ stock: newStock })
    .eq("id", material_id);

  const { error: accError } = await supabase.from("accounting_entries").insert({
    entry_type: "Expense",
    amount: total_cost,
    description: `Purchase - ${supplier} (${quantity} Boxes of ${box.name})`,
  });

  if (accError) {
    console.error("Accounting Insert Failed:", accError.message);
  }

  revalidatePath("/materials/boxes");
}

export async function adjustBoxAction(formData: FormData) {
  const material_id = formData.get("material_id") as string;
  const quantity = Number(formData.get("quantity"));
  const adjustment_type = formData.get("adjustment_type") as string;
  const rawReason = formData.get("reason") as string;
  const reason =
    rawReason && rawReason.trim() !== "" ? rawReason : "Manual Adjustment";

  const db_transaction_type =
    adjustment_type === "Add Quantity" ? "Manual Add" : "Manual Remove";

  const supabase = await createClient();

  const { data: box, error: fetchError } = await supabase
    .from("materials")
    .select("stock")
    .eq("id", material_id)
    .single();
  if (fetchError || !box) throw new Error("Box not found");

  let currentStock = Number(box.stock || 0);
  const isRemoving = adjustment_type === "Remove Quantity";

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

  if (error) throw new Error(`Database Error: ${error.message}`);

  await supabase
    .from("materials")
    .update({ stock: newStock })
    .eq("id", material_id);

  revalidatePath("/materials/boxes");
}
