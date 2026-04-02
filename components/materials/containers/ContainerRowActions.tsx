"use client";

import { useState } from "react";
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
}: {
  container: any;
  boxes: { id: string; name: string }[];
  stickers: { id: string; name: string }[];
  caps: { id: string; name: string }[];
}) {
  const router = useRouter();

  // --- MODAL STATES ---
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // --- LOADING STATES ---
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize the form state with the container's existing data
  const [containerType, setContainerType] = useState<"bottle" | "bucket">(
    container.type?.toLowerCase() === "bucket" ? "bucket" : "bottle",
  );
  const [selectedBox, setSelectedBox] = useState(container.box_id || "");
  const [selectedCap, setSelectedCap] = useState(container.cap_id || "");
  const [selectedSticker, setSelectedSticker] = useState(
    container.sticker_id || "",
  );

  // --- HANDLERS (Changed to onSubmit to force immediate UI updates) ---
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.append("id", container.id);
    formData.append("type", containerType);

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

  const blockInvalidChars = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  };

  // --- STYLING CONSTANTS ---
  const glassBackdrop =
    "fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 text-left";
  const glassModal =
    "bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden";
  const glassInput =
    "input-field !bg-white/50 !border-white/60 focus:!bg-white/90 focus:!border-[var(--lub-gold)] shadow-sm w-full";
  const labelClass = "block text-sm font-bold text-gray-700 mb-1.5";

  // Reusable Spinner SVG (Forced text-white)
  const LoadingSpinner = () => (
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
      {/* --- 1. EDIT BUTTON --- */}
      <button
        onClick={() => setIsEditOpen(true)}
        className="p-2 text-gray-400 hover:text-[var(--lub-gold)] transition-colors"
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

      {/* --- 2. DELETE BUTTON --- */}
      <button
        onClick={() => setIsDeleteOpen(true)}
        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
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

      {/* =========================================
          MODAL 1: UNIFIED DELETE CONFIRMATION
      ========================================= */}
      {isDeleteOpen && (
        <div className={glassBackdrop}>
          <div className={`${glassModal} p-8 !max-w-sm w-full text-center`}>
            <div className="w-16 h-16 bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
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
            <h3 className="text-xl font-extrabold text-gray-900">
              Are you sure?
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setIsDeleteOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 border border-white/60 bg-white/50 backdrop-blur-sm rounded-xl text-sm font-bold text-gray-700 hover:bg-white/80 transition-all shadow-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isDeleting ? (
                  <>
                    <LoadingSpinner /> Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL 2: INLINED EDIT MODAL
      ========================================= */}
      {isEditOpen && (
        <div className={glassBackdrop}>
          <div className={glassModal}>
            <div className="px-6 py-4 border-b border-white/50 bg-white/40 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-[var(--lub-dark)]">
                Edit {container.name}
              </h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-gray-500 hover:text-red-500 text-2xl leading-none font-bold"
              >
                &times;
              </button>
            </div>

            {/* CHANGED FROM action= TO onSubmit= */}
            <form
              onSubmit={handleEditSubmit}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-left">
                {/* TYPE TOGGLE */}
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
                        setSelectedBox("");
                        setSelectedCap("");
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
                        className={glassInput}
                        type="number"
                        name="capacity_per_piece"
                        defaultValue={container.capacity_per_piece}
                        step="0.01"
                        min="0.1"
                        onKeyDown={blockInvalidChars}
                        required
                      />
                      <select
                        className={`${glassInput} !w-24 shrink-0`}
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

                  {containerType === "bottle" && (
                    <>
                      <div className="md:col-span-2 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                        <h3 className={labelClass}>Box</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <label className={labelClass}>Select Box</label>
                            <select
                              className={glassInput}
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

                      <div className="md:col-span-2 flex items-start gap-4 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                        <div className="flex-1">
                          <label className={labelClass}>Cap</label>
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
                          <label className={labelClass}>Qty</label>
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

                  <div className="md:col-span-2 flex items-start gap-4 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                    <div className="flex-1">
                      <label className={labelClass}>
                        Sticker / Label (Required)
                      </label>
                      <select
                        className={glassInput}
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
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/50 bg-white/40 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-white/60 bg-white/50 backdrop-blur-sm rounded-xl text-sm font-bold text-gray-700 hover:bg-white/80 transition-all shadow-sm disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 !rounded-xl shadow-lg shadow-[var(--lub-gold)]/20 flex justify-center items-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner /> Updating...
                    </>
                  ) : (
                    "Update Container"
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
