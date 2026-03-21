"use client";
import { useState } from "react";
import { useRouter } from "next/navigation"; // <-- Added
import { purchaseStickerAction } from "@/app/actions/stickers";

export default function StickerStockInModal({
  stickers,
}: {
  stickers: { id: string; name: string }[];
}) {
  const router = useRouter(); // <-- Added
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSticker, setSelectedSticker] = useState("");

  async function handleSubmit(formData: FormData) {
    await purchaseStickerAction(formData);
    setIsOpen(false);
    setSelectedSticker("");
    router.refresh(); // <-- Added
  }

  const glassInput =
    "input-field !bg-white/50 !border-white/60 focus:!bg-white/90 focus:!border-[var(--lub-gold)] shadow-sm";

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
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 text-left">
          <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-white/50 bg-white/40 flex justify-between items-center">
              <h2 className="text-lg font-bold text-[var(--lub-dark)]">
                Stock-In Sticker Purchase
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-red-500 text-2xl leading-none font-bold"
              >
                &times;
              </button>
            </div>
            <form action={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Sticker Selection
                </label>
                <select
                  className={glassInput}
                  name="material_id"
                  required
                  value={selectedSticker}
                  onChange={(e) => setSelectedSticker(e.target.value)}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-"].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                >
                  <option value="" disabled>
                    -- Select a Sticker Size --
                  </option>
                  {stickers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Supplier Name
                </label>
                <input
                  className={glassInput}
                  type="text"
                  name="supplier"
                  placeholder="e.g., PrintWorks Inc."
                  required
                  disabled={!selectedSticker}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Quantity (PCS)
                  </label>
                  <input
                    className={glassInput}
                    type="number"
                    step="1"
                    name="quantity"
                    min="1"
                    required
                    disabled={!selectedSticker}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Rate (₹ per PCS)
                  </label>
                  <input
                    className={glassInput}
                    type="number"
                    step="0.01"
                    name="rate"
                    min="0"
                    required
                    disabled={!selectedSticker}
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-white/60 bg-white/50 backdrop-blur-sm rounded-xl text-sm font-bold text-gray-700 hover:bg-white/80 transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedSticker}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Log Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
