"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addFinishedProductAction } from "@/app/actions/finishedProducts";

export default function AddFinishedProductModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await addFinishedProductAction(formData);
    setIsOpen(false);
    router.refresh();
  }

  const glassBackdrop =
    "fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 text-left";
  const glassModal =
    "bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden";
  const glassInput =
    "input-field !bg-white/50 !border-white/60 focus:!bg-white/90 focus:!border-[var(--lub-gold)] shadow-sm";

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="h-[38px] px-4 bg-[var(--lub-gold)] hover:bg-yellow-500 text-white text-sm font-bold rounded-md transition-colors shadow-sm shrink-0 flex items-center justify-center gap-2"
      >
        + New Finished Product
      </button>

      {isOpen && (
        <div className={glassBackdrop}>
          <div className={glassModal}>
            <div className="px-6 py-4 border-b border-white/50 bg-white/40 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-[var(--lub-dark)]">
                Add Finished Product
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
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Product Name
                  </label>
                  <input
                    className={glassInput}
                    type="text"
                    name="product_name"
                    placeholder="e.g., Engine Oil"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Grade Name
                  </label>
                  <input
                    className={glassInput}
                    type="text"
                    name="grade_name"
                    placeholder="e.g., 20W40"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Bulk Storage Unit
                  </label>
                  <select className={glassInput} name="unit" required>
                    <option value="Ltr">Liter (Ltr)</option>
                    <option value="KG">Kilogram (KG)</option>
                  </select>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/50 bg-white/40 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-white/60 bg-white/50 backdrop-blur-sm rounded-xl text-sm font-bold text-gray-700 hover:bg-white/80 transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 !rounded-xl shadow-lg shadow-[var(--lub-gold)]/20"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
