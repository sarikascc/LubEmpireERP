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

  const rawMaterialsJSON = formData.get("raw_materials") as string;
  const consumedMaterials = JSON.parse(rawMaterialsJSON) as {
    material_id: string;
    quantity: number;
  }[];

  const supabase = await createClient();

  // 1. Fetch current stock AND cost of the finished product
  const { data: fp, error: fpError } = await supabase
    .from("finished_products")
    .select("stock, cost_per_unit") // <-- ADDED cost_per_unit
    .eq("id", finished_product_id)
    .single();
  if (fpError || !fp) throw new Error("Finished Product not found");

  // 2. Fetch current stock AND cost of all used raw materials
  const materialIds = consumedMaterials.map((m) => m.material_id);
  const { data: rawMaterials } = await supabase
    .from("materials")
    .select("id, stock, name, cost_per_unit") // <-- ADDED cost_per_unit
    .in("id", materialIds);

  // 🌟 CALCULATE THE COST TO MANUFACTURE THIS BATCH 🌟
  let totalProductionCost = 0;

  for (const consumed of consumedMaterials) {
    const rm = rawMaterials?.find((m) => m.id === consumed.material_id);
    if (!rm) throw new Error("Raw Material not found in database.");
    if (consumed.quantity > (rm.stock || 0)) {
      throw new Error(`Insufficient stock for ${rm.name}.`);
    }
    // Multiply the amount of raw material used by its average cost
    totalProductionCost += consumed.quantity * Number(rm.cost_per_unit || 0);
  }

  // 🌟 MOVING AVERAGE MATH FOR THE FINISHED PRODUCT 🌟
  let currentFPStock = Number(fp.stock || 0);
  let currentFPCost = Number(fp.cost_per_unit || 0);

  const currentFPValue = currentFPStock * currentFPCost;
  const newFPStock = currentFPStock + quantity_produced;

  // Blend the old oil value with the cost of the raw materials just used
  const newFPAvgCost =
    newFPStock > 0 ? (currentFPValue + totalProductionCost) / newFPStock : 0;

  // 3. Create Production Log
  const { data: prodLog, error: logError } = await supabase
    .from("production_logs")
    .insert({ finished_product_id, quantity_produced })
    .select("id")
    .single();

  if (logError || !prodLog) throw new Error("Failed to create production log");

  // 4. Update Finished Product Stock AND New Blended Cost
  await supabase
    .from("finished_products")
    .update({
      stock: newFPStock,
      cost_per_unit: newFPAvgCost, // <-- SAVING NEW BLENDED COST
    })
    .eq("id", finished_product_id);

  // 5. Deduct Raw Materials & Log Consumption
  for (const consumed of consumedMaterials) {
    const rm = rawMaterials?.find((m) => m.id === consumed.material_id);
    const newRMStock = Number(rm?.stock || 0) - consumed.quantity;

    await supabase
      .from("materials")
      .update({ stock: newRMStock })
      .eq("id", consumed.material_id);

    await supabase.from("production_material_consumption").insert({
      production_log_id: prodLog.id,
      raw_material_id: consumed.material_id,
      quantity_used: consumed.quantity,
    });

    await supabase.from("material_transactions").insert({
      material_id: consumed.material_id,
      transaction_type: "Production Use",
      quantity: -Math.abs(consumed.quantity),
      reason: `Used in production log ${prodLog.id}`,
    });
  }

  revalidatePath("/finished-products");
}

// 🔥 NEW: Fully Edit a Production Entry (Reverses old materials, applies new materials & yields)
export async function editProductionEntryAction(formData: FormData) {
  const log_id = formData.get("log_id") as string;
  const new_fp_id = formData.get("finished_product_id") as string;
  const new_qty_produced = Number(formData.get("quantity_produced"));

  const rawMaterialsJSON = formData.get("raw_materials") as string;
  const new_consumed_materials = JSON.parse(rawMaterialsJSON) as {
    material_id: string;
    quantity: number;
  }[];

  const supabase = await createClient();

  // 1. Fetch old log & old consumptions
  const { data: oldLog } = await supabase
    .from("production_logs")
    .select("*")
    .eq("id", log_id)
    .single();
  if (!oldLog) throw new Error("Log not found");

  const { data: oldConsumptions } = await supabase
    .from("production_material_consumption")
    .select("*")
    .eq("production_log_id", log_id);

  // 2. CHECK SAFETY LIMITS BEFORE REVERSING
  if (oldLog.finished_product_id === new_fp_id) {
    // If it's the same product, just check the net difference
    const delta = new_qty_produced - Number(oldLog.quantity_produced);
    const { data: fp } = await supabase
      .from("finished_products")
      .select("stock")
      .eq("id", new_fp_id)
      .single();
    if (Number(fp?.stock || 0) + delta < 0) {
      throw new Error(
        "Cannot lower yield this much. The oil from this batch has already been sold!",
      );
    }
  } else {
    // If changing to a completely different product, the old product must survive a full reversal
    const { data: oldFp } = await supabase
      .from("finished_products")
      .select("stock")
      .eq("id", oldLog.finished_product_id)
      .single();
    if (Number(oldFp?.stock || 0) - Number(oldLog.quantity_produced) < 0) {
      throw new Error(
        "Cannot change product type. The original oil has already been sold!",
      );
    }
  }

  // 3. REVERSE OLD RAW MATERIALS (Refund to stock)
  if (oldConsumptions) {
    for (const oc of oldConsumptions) {
      const { data: rm } = await supabase
        .from("materials")
        .select("stock")
        .eq("id", oc.raw_material_id)
        .single();
      if (rm) {
        await supabase
          .from("materials")
          .update({ stock: Number(rm.stock) + Number(oc.quantity_used) })
          .eq("id", oc.raw_material_id);
        await supabase.from("material_transactions").insert({
          material_id: oc.raw_material_id,
          transaction_type: "Production Edit Refund",
          quantity: Math.abs(Number(oc.quantity_used)),
          reason: `Refunded from edited production log`,
        });
      }
    }
    // Delete old consumption records
    await supabase
      .from("production_material_consumption")
      .delete()
      .eq("production_log_id", log_id);
  }

  // 4. REVERSE OLD FINISHED PRODUCT
  const { data: oldFpStock } = await supabase
    .from("finished_products")
    .select("stock")
    .eq("id", oldLog.finished_product_id)
    .single();
  if (oldFpStock) {
    const revertedStock =
      Number(oldFpStock.stock) - Number(oldLog.quantity_produced);
    await supabase
      .from("finished_products")
      .update({ stock: revertedStock })
      .eq("id", oldLog.finished_product_id);
  }

  // 5. APPLY NEW RAW MATERIALS & CALCULATE COST
  const materialIds = new_consumed_materials.map((m) => m.material_id);
  const { data: rawMaterials } = await supabase
    .from("materials")
    .select("id, stock, name, cost_per_unit")
    .in("id", materialIds);

  let totalProductionCost = 0;
  for (const consumed of new_consumed_materials) {
    const rm = rawMaterials?.find((m) => m.id === consumed.material_id);
    if (!rm) throw new Error("Raw Material not found.");
    if (consumed.quantity > (rm.stock || 0)) {
      throw new Error(`Insufficient stock for ${rm.name}.`);
    }
    totalProductionCost += consumed.quantity * Number(rm.cost_per_unit || 0);
  }

  // 6. APPLY NEW FINISHED PRODUCT MATH
  const { data: newFp } = await supabase
    .from("finished_products")
    .select("stock, cost_per_unit")
    .eq("id", new_fp_id)
    .single();
  let currentFPStock = Number(newFp?.stock || 0);
  let currentFPCost = Number(newFp?.cost_per_unit || 0);

  const currentFPValue = currentFPStock * currentFPCost;
  const newFPStock = currentFPStock + new_qty_produced;
  const newFPAvgCost =
    newFPStock > 0 ? (currentFPValue + totalProductionCost) / newFPStock : 0;

  // Update FP
  await supabase
    .from("finished_products")
    .update({
      stock: newFPStock,
      cost_per_unit: newFPAvgCost,
    })
    .eq("id", new_fp_id);

  // 7. UPDATE LOG & INSERT NEW CONSUMPTIONS
  await supabase
    .from("production_logs")
    .update({
      finished_product_id: new_fp_id,
      quantity_produced: new_qty_produced,
    })
    .eq("id", log_id);

  for (const consumed of new_consumed_materials) {
    const rm = rawMaterials?.find((m) => m.id === consumed.material_id);
    const newRMStock = Number(rm?.stock || 0) - consumed.quantity;

    await supabase
      .from("materials")
      .update({ stock: newRMStock })
      .eq("id", consumed.material_id);

    await supabase.from("production_material_consumption").insert({
      production_log_id: log_id,
      raw_material_id: consumed.material_id,
      quantity_used: consumed.quantity,
    });

    await supabase.from("material_transactions").insert({
      material_id: consumed.material_id,
      transaction_type: "Production Use",
      quantity: -Math.abs(consumed.quantity),
      reason: `Used in edited production log`,
    });
  }

  revalidatePath("/finished-products");
}
