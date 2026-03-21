"use client";
import { useState } from "react";
import { addBoxAction } from "@/app/actions/boxes";

export default function AddBoxModal() {
  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await addBoxAction(formData);
    setIsOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="h-[38px] px-4 bg-[var(--lub-gold)] hover:bg-yellow-500 text-white text-sm font-bold rounded-md transition-colors shadow-sm shrink-0 flex items-center justify-center gap-2"
      >
        + New Box
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 text-left">
          <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-white/50 bg-white/40 flex justify-between items-center">
              <h2 className="text-lg font-bold text-[var(--lub-dark)]">
                Add New Box
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
                  Box Name
                </label>
                <input
                  className="input-field !bg-white/50 !border-white/60 focus:!bg-white/90 focus:!border-[var(--lub-gold)] shadow-sm"
                  type="text"
                  name="name"
                  placeholder="e.g., 1 Ltr Carton"
                  required
                />
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
                  className="flex-1 py-2.5 px-4 bg-[var(--lub-gold)] hover:bg-yellow-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-yellow-500/20 transition-all"
                >
                  Save Box
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
