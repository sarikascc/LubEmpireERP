"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addContainerAction } from "@/app/actions/containers";

export default function AddContainerModal({
  boxes,
  stickers,
  caps,
}: {
  boxes: { id: string; name: string }[];
  stickers: { id: string; name: string }[];
  caps: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // --- Toggle State for Bottle vs Bucket ---
  const [containerType, setContainerType] = useState<"bottle" | "bucket">(
    "bottle",
  );

  // Track selections to show/hide quantity fields dynamically
  const [selectedBox, setSelectedBox] = useState("");
  const [selectedCap, setSelectedCap] = useState("");
  const [selectedSticker, setSelectedSticker] = useState("");

  // Helper function to block 'e', '+', '-' in number inputs
  const blockInvalidChars = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  async function handleSubmit(formData: FormData) {
    // 🚨 IMPORTANT: Inject the current state of the toggle into the form data
    // so the database knows if it is a Bottle or a Bucket!
    formData.append("type", containerType);

    await addContainerAction(formData);
    setIsOpen(false);

    // Reset form states
    setContainerType("bottle");
    setSelectedBox("");
    setSelectedCap("");
    setSelectedSticker("");
    router.refresh();
  }

  const glassBackdrop =
    "fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 text-left";
  const glassModal =
    "bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden";
  const glassInput =
    "input-field !bg-white/50 !border-white/60 focus:!bg-white/90 focus:!border-[var(--lub-gold)] shadow-sm";

  // Unified Label Class
  const labelClass = "block text-sm font-bold text-gray-700 mb-1.5";

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="h-[38px] px-4 bg-[var(--lub-gold)] hover:bg-yellow-500 text-white text-sm font-bold rounded-md transition-colors shadow-sm shrink-0 flex items-center justify-center gap-2"
      >
        + New Bottles/Buckets
      </button>

      {isOpen && (
        <div className={glassBackdrop}>
          <div className={glassModal}>
            <div className="px-6 py-4 border-b border-white/50 bg-white/40 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-[var(--lub-dark)]">
                Add Bottles/Buckets Configuration
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
                {/* --- TOGGLE SWITCH --- */}
                <div className="flex justify-center mb-2">
                  <div className="flex bg-gray-100 p-1 rounded-xl w-full max-w-md border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setContainerType("bottle")}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                        containerType === "bottle"
                          ? "bg-white text-[var(--lub-dark)] shadow-sm border border-gray-200"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Bottle
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setContainerType("bucket");
                        setSelectedBox(""); // Clear box selection
                        setSelectedCap(""); // Clear cap selection
                      }}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                        containerType === "bucket"
                          ? "bg-white text-[var(--lub-dark)] shadow-sm border border-gray-200"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Bucket
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* --- 1. BASIC DETAILS --- */}
                  <div className="md:col-span-2">
                    <label className={labelClass}>
                      Bottles/Buckets Name (e.g.,{" "}
                      {containerType === "bottle"
                        ? "1L Gold Bottle"
                        : "25L Red Bucket"}
                      )
                    </label>
                    <input
                      className={glassInput}
                      type="text"
                      name="name"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Capacity</label>
                    <div className="flex gap-2">
                      <input
                        className={`${glassInput} w-full`}
                        type="number"
                        name="capacity_per_piece"
                        step="0.01"
                        min="0.1"
                        onKeyDown={blockInvalidChars}
                        required
                      />
                      <select
                        className={`${glassInput} !w-24 shrink-0`}
                        name="capacity_unit"
                        required
                      >
                        <option value="Ltr">Ltr</option>
                        <option value="ml">ml</option>
                        <option value="KG">KG</option>
                        <option value="gm">gm</option>
                      </select>
                    </div>
                  </div>

                  {/* --- CONDITIONALLY RENDER BOX & CAP BASED ON TOGGLE --- */}
                  {containerType === "bottle" && (
                    <>
                      {/* --- 2. MASTER BOX --- */}
                      <div className="md:col-span-2 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <label className={labelClass}>Box</label>
                            <select
                              className={`${glassInput} w-full`}
                              name="box_id"
                              value={selectedBox}
                              onChange={(e) => setSelectedBox(e.target.value)}
                            >
                              <option value="">-- No Box Needed --</option>
                              {boxes.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className={labelClass}>
                              Bottles per Box
                            </label>
                            <input
                              className={`${glassInput} w-full`}
                              type="number"
                              name="pieces_per_box"
                              min="1"
                              required={!!selectedBox}
                              readOnly={!selectedBox}
                              value={!selectedBox ? 1 : undefined}
                              onKeyDown={blockInvalidChars}
                            />
                          </div>
                        </div>
                      </div>

                      {/* --- 3. CAP --- */}
                      <div className="md:col-span-2 flex items-start gap-4 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                        <div className="flex-1">
                          <label className={labelClass}>Cap</label>
                          <select
                            className={`${glassInput} w-full`}
                            name="cap_id"
                            value={selectedCap}
                            onChange={(e) => setSelectedCap(e.target.value)}
                          >
                            <option value="">-- No Cap Needed --</option>
                            {caps.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24 shrink-0">
                          <label className={labelClass}>Qty</label>
                          <input
                            className={`${glassInput} w-full`}
                            type="number"
                            name="cap_quantity"
                            min="1"
                            defaultValue={1} // Defaults to 1 to save Mam time
                            disabled={!selectedCap}
                            onKeyDown={blockInvalidChars}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* --- 4. STICKER (MANDATORY FOR BOTH) --- */}
                  <div className="md:col-span-2 flex items-start gap-4 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                    <div className="flex-1">
                      <label className={labelClass}>
                        Sticker / Label (Required)
                      </label>
                      <select
                        className={`${glassInput} w-full`}
                        name="sticker_id"
                        required
                        value={selectedSticker}
                        onChange={(e) => setSelectedSticker(e.target.value)}
                      >
                        <option value="">-- Select Mandatory Sticker --</option>
                        {stickers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24 shrink-0">
                      <label className={labelClass}>Qty</label>
                      <input
                        className={`${glassInput} w-full`}
                        type="number"
                        name="sticker_quantity"
                        min="1"
                        defaultValue={1} // Defaults to 1
                        required
                        onKeyDown={blockInvalidChars}
                      />
                    </div>
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
                  className="btn-primary flex-1 !rounded-xl shadow-lg shadow-[var(--lub-gold)]/20"
                >
                  Save Container
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
