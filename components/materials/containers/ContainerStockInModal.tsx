"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { purchaseContainerAction } from "@/app/actions/containers";

export default function ContainerStockInModal({
  containers,
}: {
  containers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      await purchaseContainerAction(formData);
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to purchase containers.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const glassBackdrop =
    "fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 text-left";
  const glassModal =
    "bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-2xl w-full max-w-md flex flex-col overflow-hidden";
  const glassInput =
    "input-field !bg-white/50 !border-white/60 focus:!bg-white/90 focus:!border-[var(--lub-gold)] shadow-sm";

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="h-[38px] px-4 bg-white hover:bg-gray-50 text-[var(--lub-dark)] border border-gray-200 text-sm font-bold rounded-md transition-colors shadow-sm shrink-0 flex items-center justify-center gap-2"
      >
        <span className="text-green-600 text-lg leading-none">+</span> Purchase
        Empty Bottles/Buckets
      </button>

      {isOpen && (
        <div className={glassBackdrop}>
          <div className={glassModal}>
            <div className="px-6 py-4 border-b border-white/50 bg-white/40 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-[var(--lub-dark)]">
                Stock-In Bottles/Buckets
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-red-500 text-2xl leading-none font-bold"
              >
                &times;
              </button>
            </div>

            <form action={handleSubmit} className="flex flex-col">
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Select Bottles/Buckets
                  </label>
                  <select className={glassInput} name="container_id" required>
                    <option value="">- Select Bottle/Bucket -</option>
                    {containers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      Quantity (PCS)
                    </label>
                    <input
                      className={glassInput}
                      type="number"
                      name="quantity"
                      min="1"
                      required
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      Rate per PC (₹)
                    </label>
                    <input
                      className={glassInput}
                      type="number"
                      step="0.01"
                      name="rate"
                      min="0"
                      required
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Supplier / Reason
                  </label>
                  <input
                    className={glassInput}
                    type="text"
                    name="supplier"
                    placeholder="e.g., Global Plastics Ltd."
                    required
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/50 bg-white/40 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-white/60 bg-white/50 rounded-xl text-sm font-bold text-gray-700 hover:bg-white/80 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 !rounded-xl shadow-lg shadow-[var(--lub-gold)]/20 disabled:opacity-50"
                >
                  {isSubmitting ? "Processing..." : "Confirm Purchase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
