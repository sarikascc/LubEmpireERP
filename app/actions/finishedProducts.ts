"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addFinishedProductAction(formData: FormData) {
  const product_name = formData.get("product_name") as string;
  const grade_name = formData.get("grade_name") as string;
  const unit = formData.get("unit") as string;

  const supabase = await createClient();
  const { error } = await supabase.from("finished_products").insert({
    product_name,
    grade_name,
    unit,
    stock: 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/finished-products");
}

export async function editFinishedProductAction(formData: FormData) {
  const id = formData.get("id") as string;
  const product_name = formData.get("product_name") as string;
  const grade_name = formData.get("grade_name") as string;
  const unit = formData.get("unit") as string;

  const supabase = await createClient();
  const { error } = await supabase
    .from("finished_products")
    .update({ product_name, grade_name, unit })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/finished-products");
}
export async function deleteFinishedProductAction(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();

  // 1. Delete linked sales orders
  await supabase.from("orders").delete().eq("finished_product_id", id);

  // 2. Fetch linked production logs to clear them out
  const { data: prodLogs } = await supabase
    .from("production_logs")
    .select("id")
    .eq("finished_product_id", id);

  const logIds = prodLogs?.map((log) => log.id) || [];

  // 3. If there are production logs, we must delete their material usage first
  if (logIds.length > 0) {
    await supabase
      .from("production_material_consumption")
      .delete()
      .in("production_log_id", logIds);

    // 4. Now safely delete the production logs themselves
    await supabase
      .from("production_logs")
      .delete()
      .eq("finished_product_id", id);
  }

  // 5. FINALLY, the database locks are completely gone. Delete the Finished Product!
  const { error } = await supabase
    .from("finished_products")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting product:", error);
    throw new Error(error.message);
  }

  // Refresh pages
  revalidatePath("/finished-products");
  revalidatePath("/accounting/orders");
  revalidatePath("/reports");
}

export async function addProductionEntryAction(formData: FormData) {
  const finished_product_id = formData.get("finished_product_id") as string;
  const quantity_produced = Number(formData.get("quantity_produced"));

  // The frontend will send the dynamic rows as a JSON string
  const rawMaterialsJSON = formData.get("raw_materials") as string;
  const consumedMaterials = JSON.parse(rawMaterialsJSON) as {
    material_id: string;
    quantity: number;
  }[];

  const supabase = await createClient();

  // 1. Fetch current stock of the finished product
  const { data: fp, error: fpError } = await supabase
    .from("finished_products")
    .select("stock")
    .eq("id", finished_product_id)
    .single();
  if (fpError || !fp) throw new Error("Finished Product not found");

  // 2. Fetch current stock of all used raw materials for safety check
  const materialIds = consumedMaterials.map((m) => m.material_id);
  const { data: rawMaterials } = await supabase
    .from("materials")
    .select("id, stock, name")
    .in("id", materialIds);

  // BACKEND SAFETY CHECK: Ensure we have enough raw materials
  for (const consumed of consumedMaterials) {
    const rm = rawMaterials?.find((m) => m.id === consumed.material_id);
    if (!rm) throw new Error("Raw Material not found in database.");
    if (consumed.quantity > (rm.stock || 0)) {
      throw new Error(
        `Insufficient stock for ${rm.name}. Needed: ${consumed.quantity}, Available: ${rm.stock}`,
      );
    }
  }

  // 3. Create Production Log
  const { data: prodLog, error: logError } = await supabase
    .from("production_logs")
    .insert({ finished_product_id, quantity_produced })
    .select("id")
    .single();

  if (logError || !prodLog) throw new Error("Failed to create production log");

  // 4. Update Finished Product Stock
  await supabase
    .from("finished_products")
    .update({ stock: Number(fp.stock || 0) + quantity_produced })
    .eq("id", finished_product_id);

  // 5. Deduct Raw Materials & Log Consumption
  for (const consumed of consumedMaterials) {
    const rm = rawMaterials?.find((m) => m.id === consumed.material_id);
    const newStock = Number(rm?.stock || 0) - consumed.quantity;

    // Deduct stock
    await supabase
      .from("materials")
      .update({ stock: newStock })
      .eq("id", consumed.material_id);

    // Map it to the production log
    await supabase.from("production_material_consumption").insert({
      production_log_id: prodLog.id,
      raw_material_id: consumed.material_id,
      quantity_used: consumed.quantity,
    });

    // Add to Material Transactions (For audit trails)
    await supabase.from("material_transactions").insert({
      material_id: consumed.material_id,
      transaction_type: "Production Use",
      quantity: -Math.abs(consumed.quantity),
      reason: `Used in production log ${prodLog.id}`,
    });
  }

  revalidatePath("/finished-products");
}
