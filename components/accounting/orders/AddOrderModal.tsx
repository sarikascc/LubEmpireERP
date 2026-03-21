"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrderAction } from "@/app/actions/orders";

export default function AddOrderModal({
  finishedProducts,
  containers,
}: {
  finishedProducts: {
    id: string;
    product_name: string;
    grade_name: string;
    stock: number;
    unit: string;
  }[];
  containers: { id: string; name: string; pieces_per_box: number }[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const blockInvalidChars = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  };

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      await createOrderAction(formData);
      setIsOpen(false);
      router.refresh();
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const glassBackdrop =
    "fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 text-left";
  const glassModal =
    "bg-white/70 backdrop-blur-xl border border-white/60 shadow-sm rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden";
  const glassInput =
    "w-full p-2.5 bg-white/50 border border-white/60 rounded-xl text-sm focus:bg-white focus:border-[var(--lub-gold)] outline-none transition-all shadow-sm";
  const labelClass = "block text-sm font-bold text-gray-700 mb-1.5";

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="h-[38px] px-4 bg-[var(--lub-gold)] hover:bg-yellow-500 text-white text-sm font-bold rounded-md transition-colors shadow-sm shrink-0 flex items-center justify-center gap-2"
      >
        + Create Sales Order
      </button>

      {isOpen && (
        <div className={glassBackdrop}>
          <div className={glassModal}>
            <div className="px-6 py-4 border-b border-white/50 bg-white/40 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-[var(--lub-dark)]">
                Create New Sales Order
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-red-500 text-2xl leading-none font-bold"
              >
                &times;
              </button>
            </div>

            <form
              action={handleSubmit}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* 1. CUSTOMER NAME */}
                <div>
                  <label className={labelClass}>Customer / Client Name</label>
                  <input
                    type="text"
                    name="customer_name"
                    required
                    placeholder="e.g., Reliance Industries"
                    className={glassInput}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* 2. PRODUCT SELECTION */}
                  <div className="md:col-span-2">
                    <label className={labelClass}>Finished Product (Oil)</label>
                    <select
                      name="finished_product_id"
                      required
                      className={glassInput}
                    >
                      <option value="">-- Select Product --</option>
                      {finishedProducts.map((fp) => (
                        <option key={fp.id} value={fp.id}>
                          {fp.product_name} ({fp.grade_name}) - {fp.stock}{" "}
                          {fp.unit} available
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. CONTAINER SELECTION */}
                  <div className="md:col-span-2">
                    <label className={labelClass}>
                      Packaging (Bottle / Bucket)
                    </label>
                    <select name="container_id" required className={glassInput}>
                      <option value="">-- Select Packaging --</option>
                      {containers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 4. QUANTITY (Smart label for clarity) */}
                  <div>
                    <label className={labelClass}>
                      Quantity (Cartons / Buckets)
                    </label>
                    <input
                      type="number"
                      name="boxes_quantity"
                      min="1"
                      required
                      onKeyDown={blockInvalidChars}
                      placeholder="e.g., 50"
                      className={glassInput}
                    />
                  </div>

                  {/* 5. RATE */}
                  <div>
                    <label className={labelClass}>Rate per Piece (₹)</label>
                    <input
                      type="number"
                      name="rate_per_piece"
                      step="0.01"
                      min="0.01"
                      required
                      onKeyDown={blockInvalidChars}
                      placeholder="e.g., 1500.00"
                      className={glassInput}
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/50 bg-white/40 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-white/60 bg-white/50 rounded-xl text-sm font-bold text-gray-700 hover:bg-white/80 transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 !rounded-xl shadow-lg shadow-[var(--lub-gold)]/20 disabled:opacity-50"
                >
                  {isSubmitting ? "Processing..." : "Confirm Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
