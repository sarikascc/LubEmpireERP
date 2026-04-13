"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  deleteContainerAction,
  editContainerAction,
} from "@/app/actions/containers";

export default function ContainerRowActions({
  container,
  boxes,
  stickers,
  caps,
  existingContainers = [], // 🔥 Added to receive base containers
}: {
  container: any;
  boxes: { id: string; name: string }[];
  stickers: { id: string; name: string }[];
  caps: { id: string; name: string }[];
  existingContainers?: {
    id: string;
    name: string;
    capacity_per_piece: number;
    capacity_unit: string;
    type?: string;
    base_container_id?: string | null;
  }[];
}) {
  const router = useRouter();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- INITIALIZE EDIT STATES BASED ON EXISTING CONTAINER ---
  const [containerType, setContainerType] = useState<"bottle" | "bucket">(
    container.type?.toLowerCase() === "bucket" ? "bucket" : "bottle",
  );
  const [creationMode, setCreationMode] = useState<"custom" | "variant">(
    container.base_container_id ? "variant" : "custom",
  );

  const [selectedBaseContainer, setSelectedBaseContainer] = useState(
    container.base_container_id || "",
  );
  const [selectedBox, setSelectedBox] = useState(container.box_id || "");
  const [selectedCap, setSelectedCap] = useState(container.cap_id || "");
  const [selectedSticker, setSelectedSticker] = useState(
    container.sticker_id || "",
  );
  const [piecesPerBox, setPiecesPerBox] = useState<number | "">(
    container.pieces_per_box || 1,
  );

  // 🔥 Strictly separate Bottles/Buckets AND completely hide Variants AND prevent self-selection
  const filteredExistingContainers =
    existingContainers?.filter((c) => {
      const dbType = (c.type || "bottle").toLowerCase();
      return (
        dbType === containerType &&
        !c.base_container_id &&
        c.id !== container.id
      );
    }) || [];

  useEffect(() => {
    // Reset selections if the physical type is changed
    if (isEditOpen) {
      setSelectedBaseContainer("");
    }
  }, [containerType]);

  const blockInvalidChars = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.append("id", container.id);
    formData.append("type", containerType);
    formData.append("creation_mode", creationMode);

    try {
      await editContainerAction(formData);
      setIsEditOpen(false);
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    setIsDeleting(true);
    try {
      const fd = new FormData();
      fd.append("id", container.id);
      await deleteContainerAction(fd);
      setIsDeleteOpen(false);
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

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
    <div className="flex items-center justify-end gap-2">
      {/* --- EDIT BUTTON --- */}
      <button
        onClick={() => setIsEditOpen(true)}
        className="p-2 text-gray-400 hover:text-[var(--lub-gold)] transition-colors focus:outline-none"
        title="Edit Container"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
          />
        </svg>
      </button>

      {/* --- DELETE BUTTON --- */}
      <button
        onClick={() => setIsDeleteOpen(true)}
        className="p-2 text-gray-400 hover:text-red-500 transition-colors focus:outline-none"
        title="Delete Container"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>

      {/* DELETE MODAL */}
      {isDeleteOpen && (
        <div className={glassBackdrop}>
          <div className={`${glassModal} !max-w-sm p-8 text-center`}>
            <div className="w-16 h-16 bg-red-50/80 border border-red-100 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-extrabold text-[#334155]">
              Are you sure?
            </h3>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setIsDeleteOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 bg-white text-gray-700 font-bold rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 shadow-md transition-all flex justify-center items-center gap-2 disabled:opacity-70"
              >
                {isDeleting ? (
                  <>
                    <Spinner /> Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div
          className={glassBackdrop}
          onClick={() => !isSubmitting && setIsEditOpen(false)}
        >
          <div className={glassModal} onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 flex justify-between items-center border-b border-gray-200/50 shrink-0">
              <h2 className="text-[15px] font-extrabold text-[#334155]">
                Edit {container.name}
              </h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none focus:outline-none"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={handleEditSubmit}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
                {/* TOP SETTINGS ROW */}
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
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${containerType === "bottle" ? "bg-white text-[#334155] shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Bottle
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setContainerType("bucket");
                          setSelectedBox("");
                          setSelectedCap("");
                        }}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${containerType === "bucket" ? "bg-white text-[#334155] shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
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
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${creationMode === "custom" ? "bg-white text-[#334155] shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
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
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${creationMode === "variant" ? "bg-white text-[#334155] shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
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
                          No valid existing base {containerType}s found.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className={labelClass}>Container Name</label>
                    <input
                      className={glassInput}
                      type="text"
                      name="name"
                      defaultValue={container.name}
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
                        defaultValue={container.capacity_per_piece}
                        step="0.01"
                        min="0.1"
                        onKeyDown={blockInvalidChars}
                        required
                      />
                      <select
                        className={`${glassInput} !w-28 shrink-0`}
                        name="capacity_unit"
                        defaultValue={container.capacity_unit}
                        required
                      >
                        <option value="Ltr">Ltr</option>
                        <option value="ml">ml</option>
                        <option value="KG">KG</option>
                        <option value="gm">gm</option>
                      </select>
                    </div>
                  </div>

                  {creationMode === "custom" && (
                    <>
                      {containerType === "bottle" && (
                        <>
                          <div className="md:col-span-2 p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-extrabold text-gray-700 mb-4 border-b border-gray-100 pb-2">
                              Master Box Configuration
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="md:col-span-2">
                                <label className={labelClass}>Select Box</label>
                                <select
                                  className={glassInput}
                                  name="box_id"
                                  value={selectedBox}
                                  onChange={(e) =>
                                    setSelectedBox(e.target.value)
                                  }
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
                                  className={glassInput}
                                  type="number"
                                  name="pieces_per_box"
                                  min="1"
                                  defaultValue={container.pieces_per_box || 1}
                                  required={!!selectedBox}
                                  readOnly={!selectedBox}
                                  onKeyDown={blockInvalidChars}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="md:col-span-2 flex items-start gap-4 p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex-1">
                              <label className={labelClass}>Bottle Cap</label>
                              <select
                                className={glassInput}
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
                              <label className={labelClass}>Qty Used</label>
                              <input
                                className={glassInput}
                                type="number"
                                name="cap_quantity"
                                min="1"
                                defaultValue={container.cap_quantity || 1}
                                disabled={!selectedCap}
                                onKeyDown={blockInvalidChars}
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <div className="md:col-span-2 flex items-start gap-4 p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex-1">
                          <label className={labelClass}>
                            Sticker / Label{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <select
                            className={glassInput}
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
                          <label className={labelClass}>Qty Used</label>
                          <input
                            className={glassInput}
                            type="number"
                            name="sticker_quantity"
                            min="1"
                            defaultValue={container.sticker_quantity || 1}
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
                  onClick={() => setIsEditOpen(false)}
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
                      <Spinner /> Updating...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
