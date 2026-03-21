"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addRawMaterial } from "@/app/actions/materials";

export default function AddMaterialModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Wrapper function to close the modal and refresh the page after submitting
  async function handleSubmit(formData: FormData) {
    await addRawMaterial(formData);
    setIsOpen(false);
    router.refresh(); // Instantly fetch the new list of materials
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="h-[38px] px-4 bg-[var(--lub-gold)] hover:bg-yellow-500 text-white text-sm font-bold rounded-md transition-colors shadow-sm shrink-0 flex items-center justify-center gap-2"
      >
        + New Material
      </button>

      {/* The Popup Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-[var(--lub-dark)]">
                Add Raw Material
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-red-500 text-2xl leading-none font-bold"
              >
                &times;
              </button>
            </div>

            <form action={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[var(--lub-text)] mb-1.5">
                  Material Name
                </label>
                <input
                  className="input-field"
                  type="text"
                  name="name"
                  placeholder="e.g., Base Oil SN 150"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--lub-text)] mb-1.5">
                  Measurement Unit
                </label>
                <select className="input-field bg-white" name="unit" required>
                  <option value="Ltr">Liter (Ltr.)</option>
                  <option value="KG">Kilogram (KG)</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-200 rounded-md text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
