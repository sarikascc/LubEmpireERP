"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { purchaseContainerAction } from "@/app/actions/containers";

export default function ContainerStockInModal({
  containers,
}: {
  // 🔥 Added base_container_id to the type definition so we can check it
  containers: { id: string; name: string; base_container_id?: string | null }[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState("");

  // 🔥 BULLETPROOF FILTER: Ensure ONLY Base Containers (parents) make it into the dropdown
  const baseContainersOnly = containers.filter((c) => !c.base_container_id);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    try {
      await purchaseContainerAction(formData);
      setIsOpen(false);
      setSelectedContainer("");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to purchase containers.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- STYLES FOR THE GLASSY MODAL UI ---
  const glassBackdrop =
    "fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 text-left";
  const glassModal =
    "bg-[#f4f5f7]/95 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-3xl w-full max-w-md flex flex-col overflow-hidden";
  const glassInput =
    "w-full p-3 bg-white border border-gray-100 shadow-sm rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all";

  const Spinner = () => (
    <svg
      className="w-5 h-5 animate-spin text-white"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="h-[38px] px-4 bg-[var(--lub-blue)] hover:bg-[#2e376b] text-white text-sm font-bold rounded-md transition-colors shadow-sm shrink-0 flex items-center justify-center gap-2"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        Stock-In
      </button>

      {isOpen && (
        <div
          className={glassBackdrop}
          onClick={() => !isSubmitting && setIsOpen(false)}
        >
          <div className={glassModal} onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 flex justify-between items-center border-b border-gray-200/50 shrink-0">
              <h2 className="text-[15px] font-extrabold text-[#334155]">
                Stock-In Bottles/Buckets
              </h2>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSelectedContainer("");
                }}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none focus:outline-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Select Bottles/Buckets
                  </label>
                  <select
                    className={glassInput}
                    name="container_id"
                    required
                    value={selectedContainer}
                    onChange={(e) => setSelectedContainer(e.target.value)}
                  >
                    <option value="" disabled>
                      - Select Base Bottle/Bucket -
                    </option>
                    {/* 🔥 Now mapping over the strictly filtered array! */}
                    {baseContainersOnly.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                      Quantity (PCS)
                    </label>
                    <input
                      className={glassInput}
                      type="number"
                      name="quantity"
                      min="1"
                      required
                      placeholder="0"
                      disabled={!selectedContainer}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
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
                      disabled={!selectedContainer}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Supplier / Reason
                  </label>
                  <input
                    className={glassInput}
                    type="text"
                    name="supplier"
                    placeholder="e.g., Global Plastics Ltd."
                    required
                    disabled={!selectedContainer}
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200/50 bg-gray-50 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setSelectedContainer("");
                  }}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 bg-white text-gray-700 font-bold rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedContainer}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner /> Logging...
                    </>
                  ) : (
                    "Confirm Purchase"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
