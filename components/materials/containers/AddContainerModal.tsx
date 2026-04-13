"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addContainerAction } from "@/app/actions/containers";

export default function AddContainerModal({
  boxes,
  stickers,
  caps,
  existingContainers,
}: {
  boxes: { id: string; name: string }[];
  stickers: { id: string; name: string }[];
  caps: { id: string; name: string }[];
  existingContainers?: {
    id: string;
    name: string;
    capacity_per_piece: number;
    capacity_unit: string;
    type?: string;
    base_container_id?: string | null; // 🔥 ADDED: Type definition for the base id
  }[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Toggle States ---
  const [containerType, setContainerType] = useState<"bottle" | "bucket">(
    "bottle",
  );
  const [creationMode, setCreationMode] = useState<"custom" | "variant">(
    "custom",
  );

  const [selectedBaseContainer, setSelectedBaseContainer] = useState("");
  const [selectedBox, setSelectedBox] = useState("");
  const [selectedCap, setSelectedCap] = useState("");
  const [selectedSticker, setSelectedSticker] = useState("");
  const [piecesPerBox, setPiecesPerBox] = useState<number | "">(1);

  // 🔥 BULLETPROOF FILTERING: Strictly separate Bottles/Buckets AND completely hide Variants
  const filteredExistingContainers =
    existingContainers?.filter((c) => {
      const dbType = (c.type || "bottle").toLowerCase();
      // Only show items that match the type AND do NOT have a base_container_id
      return dbType === containerType && !c.base_container_id;
    }) || [];

  // Reset the base container selection whenever the user switches between Bottle/Bucket
  useEffect(() => {
    setSelectedBaseContainer("");
  }, [containerType]);

  const blockInvalidChars = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.append("type", containerType);
    formData.append("creation_mode", creationMode);

    try {
      await addContainerAction(formData);
      setIsOpen(false);

      // Reset form states
      setContainerType("bottle");
      setCreationMode("custom");
      setSelectedBaseContainer("");
      setSelectedBox("");
      setSelectedCap("");
      setSelectedSticker("");
      setPiecesPerBox(1);

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to add container.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- STYLES FOR THE GLASSY MODAL UI ---
  const glassBackdrop =
    "fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 text-left";
  const glassModal =
    "bg-[#f4f5f7]/95 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-3xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden";
  const glassInput =
    "w-full p-3 bg-white border border-gray-100 shadow-sm rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--lub-gold)]/50 transition-all";
  const labelClass =
    "block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide";

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
        className="h-[38px] px-4 bg-[var(--lub-gold)] hover:bg-yellow-500 text-white text-sm font-bold rounded-md transition-colors shadow-sm shrink-0 flex items-center justify-center gap-2"
      >
        + New Bottles/Buckets
      </button>

      {isOpen && (
        <div
          className={glassBackdrop}
          onClick={() => !isSubmitting && setIsOpen(false)}
        >
          <div className={glassModal} onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 flex justify-between items-center border-b border-gray-200/50 shrink-0">
              <h2 className="text-[15px] font-extrabold text-[#334155]">
                Add {containerType === "bottle" ? "Bottle" : "Bucket"}{" "}
                Configuration
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none focus:outline-none"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
                {/* --- TOP SETTINGS ROW --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Container Type */}
                  <div>
                    <label className="block text-center text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                      Physical Type
                    </label>
                    <div className="flex bg-gray-200/60 p-1.5 rounded-xl w-full border border-gray-200 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setContainerType("bottle")}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                          containerType === "bottle"
                            ? "bg-white text-[#334155] shadow-sm border border-gray-200"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Bottle
                      </button>
                      <button
                        type="button"
                        onClick={() => setContainerType("bucket")}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                          containerType === "bucket"
                            ? "bg-white text-[#334155] shadow-sm border border-gray-200"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Bucket
                      </button>
                    </div>
                  </div>

                  {/* Creation Mode Toggle */}
                  <div>
                    <label className="block text-center text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                      Build Mode
                    </label>
                    <div className="flex bg-gray-200/60 p-1.5 rounded-xl w-full border border-gray-200 shadow-inner">
                      <button
                        type="button"
                        onClick={() => {
                          setCreationMode("custom");
                          setSelectedBaseContainer("");
                        }}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                          creationMode === "custom"
                            ? "bg-white text-[#334155] shadow-sm border border-gray-200"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Custom
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreationMode("variant");
                          setSelectedBox("");
                          setSelectedCap("");
                          setSelectedSticker("");
                        }}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                          creationMode === "variant"
                            ? "bg-white text-[#334155] shadow-sm border border-gray-200"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Variant
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* 🔥 DYNAMIC: Base Container Selection */}
                  {creationMode === "variant" && (
                    <div className="md:col-span-2 p-5 bg-yellow-50/50 rounded-2xl shadow-sm border border-yellow-200/50 mb-2">
                      <label className={labelClass}>
                        Select Base{" "}
                        {containerType === "bottle" ? "Bottle" : "Bucket"}
                      </label>
                      <select
                        className={glassInput}
                        name="base_container_id"
                        required
                        value={selectedBaseContainer}
                        onChange={(e) =>
                          setSelectedBaseContainer(e.target.value)
                        }
                      >
                        <option value="" disabled>
                          -- Select Existing{" "}
                          {containerType === "bottle" ? "Bottle" : "Bucket"} --
                        </option>
                        {filteredExistingContainers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (Base Capacity: {c.capacity_per_piece}{" "}
                            {c.capacity_unit})
                          </option>
                        ))}
                      </select>
                      {filteredExistingContainers.length === 0 && (
                        <p className="text-xs text-red-500 mt-2 font-bold">
                          No existing Base {containerType}s found. Please use
                          Custom mode.
                        </p>
                      )}
                    </div>
                  )}

                  {/* --- 1. BASIC DETAILS --- */}
                  <div className="md:col-span-2">
                    <label className={labelClass}>
                      {creationMode === "variant"
                        ? `New Variant Name`
                        : `${containerType === "bottle" ? "Bottle" : "Bucket"} Name`}
                    </label>
                    <input
                      className={glassInput}
                      type="text"
                      name="name"
                      placeholder={
                        creationMode === "variant"
                          ? `e.g., 1L Gold ${containerType === "bottle" ? "Bottle" : "Bucket"} (800ml Fill)`
                          : containerType === "bottle"
                            ? "e.g., 1L Gold Bottle"
                            : "e.g., 25L Red Bucket"
                      }
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>
                      {creationMode === "variant"
                        ? "New Fill Capacity"
                        : "Capacity"}
                    </label>
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
                        className={`${glassInput} !w-28 shrink-0`}
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

                  {/* --- CONDITIONALLY RENDER BOX/CAP/STICKER ONLY IF "CUSTOM" --- */}
                  {creationMode === "custom" && (
                    <>
                      {/* --- 2. MASTER BOX (BOTTLES ONLY) --- */}
                      {containerType === "bottle" && (
                        <div className="md:col-span-2 p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
                          <h3 className="text-sm font-extrabold text-gray-700 mb-4 border-b border-gray-100 pb-2">
                            Master Box Configuration
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <label className={labelClass}>Select Box</label>
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
                                value={!selectedBox ? 1 : piecesPerBox}
                                onChange={(e) =>
                                  setPiecesPerBox(
                                    e.target.value
                                      ? Number(e.target.value)
                                      : "",
                                  )
                                }
                                onKeyDown={blockInvalidChars}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* --- 3. CAP (BOTTLES ONLY) --- */}
                      {containerType === "bottle" && (
                        <div className="md:col-span-2 flex items-start gap-4 p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
                          <div className="flex-1">
                            <label className={labelClass}>Bottle Cap</label>
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
                              defaultValue={1}
                              disabled={!selectedCap}
                              onKeyDown={blockInvalidChars}
                            />
                          </div>
                        </div>
                      )}

                      {/* --- 4. STICKER (MANDATORY FOR CUSTOM) --- */}
                      <div className="md:col-span-2 flex items-start gap-4 p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex-1">
                          <label className={labelClass}>
                            Sticker / Label{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <select
                            className={`${glassInput} w-full`}
                            name="sticker_id"
                            required
                            value={selectedSticker}
                            onChange={(e) => setSelectedSticker(e.target.value)}
                          >
                            <option value="">
                              -- Select Mandatory Sticker --
                            </option>
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
                            defaultValue={1}
                            required
                            onKeyDown={blockInvalidChars}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200/50 bg-gray-50 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 bg-white text-gray-700 font-bold rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 bg-[var(--lub-gold)] text-white font-bold rounded-xl shadow-md hover:brightness-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner /> Saving...
                    </>
                  ) : (
                    `Save ${containerType === "bottle" ? "Bottle" : "Bucket"}`
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
