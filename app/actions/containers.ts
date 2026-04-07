"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. CREATE NEW CONTAINER & RECIPE (UPDATED FOR VARIANT MODE)
export async function addContainerAction(formData: FormData) {
  const name = formData.get("name") as string;
  const capacity_per_piece = Number(formData.get("capacity_per_piece"));
  const capacity_unit = formData.get("capacity_unit") as string;
  const type = formData.get("type") as string;

  // ---> NEW: Extract Variant Mode flags
  const creation_mode = formData.get("creation_mode") as string;
  const base_container_id = formData.get("base_container_id") as string;

  const supabase = await createClient();

  // Initialize variables to hold the final accessory configuration
  let box_id: string | null = null;
  let pieces_per_box = 1;
  let cap_id: string | null = null;
  let cap_quantity = 0;
  let sticker_id: string | null = null;
  let sticker_quantity = 1;

  // 🔥 MAGIC: IF IT IS A VARIANT, COPY FROM THE BASE CONTAINER 🔥
  if (creation_mode === "variant") {
    if (!base_container_id)
      throw new Error("Base container is required for variant mode.");

    const { data: baseContainer, error: fetchError } = await supabase
      .from("containers")
      .select(
        "box_id, pieces_per_box, cap_id, cap_quantity, sticker_id, sticker_quantity",
      )
      .eq("id", base_container_id)
      .single();

    if (fetchError || !baseContainer) {
      throw new Error("Could not fetch the base container configuration.");
    }

    // Apply the copied configuration
    box_id = baseContainer.box_id;
    pieces_per_box = baseContainer.pieces_per_box || 1;
    cap_id = baseContainer.cap_id;
    cap_quantity = baseContainer.cap_quantity || 0;
    sticker_id = baseContainer.sticker_id;
    sticker_quantity = baseContainer.sticker_quantity || 1;
  } else {
    // 🔥 STANDARD MODE: Extract directly from form data 🔥
    box_id = (formData.get("box_id") as string) || null;
    pieces_per_box = Number(formData.get("pieces_per_box")) || 1;
    cap_id = (formData.get("cap_id") as string) || null;
    cap_quantity = Number(formData.get("cap_quantity")) || 0;
    sticker_id = (formData.get("sticker_id") as string) || null;
    sticker_quantity = Number(formData.get("sticker_quantity")) || 1;
  }

  // Insert the new container/variant into the database
  const { error } = await supabase.from("containers").insert({
    name,
    type,
    stock: 0, // Starts at 0 when you first create it
    capacity_per_piece,
    capacity_unit,
    pieces_per_box,
    box_id,
    cap_id,
    cap_quantity,
    sticker_id,
    sticker_quantity,
  });

  if (error) {
    console.error("Insert Error:", error);
    throw new Error(error.message);
  }
  revalidatePath("/materials/containers");
}

// 2. EDIT EXISTING CONTAINER RECIPE
export async function editContainerAction(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const capacity_per_piece = Number(formData.get("capacity_per_piece"));
  const capacity_unit = formData.get("capacity_unit") as string;

  const type = formData.get("type") as string;

  const box_id = formData.get("box_id") as string;
  const pieces_per_box = Number(formData.get("pieces_per_box")) || 1;

  const cap_id = formData.get("cap_id") as string;
  const cap_quantity = Number(formData.get("cap_quantity")) || 0;

  const sticker_id = formData.get("sticker_id") as string;
  const sticker_quantity = Number(formData.get("sticker_quantity")) || 1;

  const supabase = await createClient();

  const { error } = await supabase
    .from("containers")
    .update({
      name,
      type,
      capacity_per_piece,
      capacity_unit,
      pieces_per_box,
      box_id: box_id || null,
      cap_id: cap_id || null,
      cap_quantity,
      sticker_id,
      sticker_quantity,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/materials/containers");
}

// 3. THE "BULLDOZER" DELETE
export async function deleteContainerAction(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();

  await supabase.from("container_transactions").delete().eq("container_id", id);
  await supabase.from("orders").delete().eq("container_id", id);
  const { error } = await supabase.from("containers").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/materials/containers");
  revalidatePath("/accounting/orders");
}

// 4. PURCHASE STOCK (ADD EMPTY BOTTLES)
export async function purchaseContainerAction(formData: FormData) {
  const container_id = formData.get("container_id") as string;
  const quantity = Number(formData.get("quantity"));
  const rate = Number(formData.get("rate"));
  const supplier = (formData.get("supplier") as string) || "Unknown Supplier";
  const total_cost = quantity * rate;

  const supabase = await createClient();

  // 1. Fetch current stock and cost
  const { data: container, error: fetchError } = await supabase
    .from("containers")
    .select("name, stock, cost_per_piece")
    .eq("id", container_id)
    .single();

  if (fetchError || !container) throw new Error("Container not found");

  // 🌟 THE MOVING AVERAGE MATH 🌟
  let currentStock = Number(container.stock || 0);
  let currentAvgCost = Number(container.cost_per_piece || 0);

  const currentTotalValue = currentStock * currentAvgCost;
  const newPurchaseValue = quantity * rate;

  const newStock = currentStock + quantity;
  const newAvgCost =
    newStock > 0 ? (currentTotalValue + newPurchaseValue) / newStock : 0;

  // 2. Update Stock and Average Cost
  await supabase
    .from("containers")
    .update({
      stock: newStock,
      cost_per_piece: newAvgCost, // <-- SAVING NEW BLENDED COST
    })
    .eq("id", container_id);

  // 3. Log Transactions
  await supabase.from("container_transactions").insert({
    container_id,
    transaction_type: "Purchase",
    quantity,
    rate,
    reason: supplier,
  });

  const { error: accError } = await supabase.from("accounting_entries").insert({
    entry_type: "Expense",
    amount: total_cost,
    description: `Purchase - ${supplier} (${quantity} units of ${container.name})`,
  });

  if (accError) console.error("Accounting Insert Failed:", accError.message);

  revalidatePath("/materials/containers");
}

// 5. ADJUST STOCK (MANUAL CORRECTIONS / BREAKAGES)
export async function adjustContainerAction(formData: FormData) {
  const container_id = formData.get("container_id") as string;
  const quantity = Number(formData.get("quantity"));
  const adjustment_type = formData.get("adjustment_type") as string;

  const supabase = await createClient();

  const { data: container, error: fetchError } = await supabase
    .from("containers")
    .select("stock")
    .eq("id", container_id)
    .single();

  if (fetchError || !container) throw new Error("Container not found");

  let currentStock = Number(container.stock || 0);
  const isRemoving = adjustment_type === "Remove Quantity";

  if (isRemoving && quantity > currentStock) {
    throw new Error(
      `Cannot remove ${quantity}. Only ${currentStock} empty containers left in stock.`,
    );
  }

  const actualQuantity = isRemoving ? -Math.abs(quantity) : Math.abs(quantity);
  const newStock = currentStock + actualQuantity;

  const { error } = await supabase
    .from("containers")
    .update({ stock: newStock })
    .eq("id", container_id);
  if (error) throw new Error(`Database Error: ${error.message}`);

  await supabase.from("container_transactions").insert({
    container_id,
    transaction_type: isRemoving ? "Manual Remove" : "Manual Add",
    quantity: actualQuantity,
    rate: 0,
    reason: "Stock Adjustment",
  });

  revalidatePath("/materials/containers");
}
