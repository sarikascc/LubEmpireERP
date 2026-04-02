"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteCapAction,
  adjustCapAction,
  editCapAction,
} from "@/app/actions/caps";

export default function CapRowActions({ cap }: { cap: any }) {
  const router = useRouter();

  // --- MODAL STATES ---
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState("Add Quantity");

  // --- LOADING STATES ---
  const [isEditing, setIsEditing] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- HANDLERS (Changed to onSubmit to force immediate UI updates) ---
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsEditing(true);

    const fd = new FormData(e.currentTarget);
    try {
      await editCapAction(fd);
      setIsEditOpen(false);
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Something went wrong");
    } finally {
      setIsEditing(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAdjusting(true);

    const fd = new FormData(e.currentTarget);
    fd.append("adjustment_type", adjustmentType);

    try {
      await adjustCapAction(fd);
      setIsStockOpen(false);
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Something went wrong");
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    setIsDeleting(true);
    try {
      const fd = new FormData();
      fd.append("id", cap.id);
      await deleteCapAction(fd);
      setIsDeleteOpen(false);
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  };

  // --- STYLES & COMPONENTS ---
  const glassBackdrop =
    "fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 text-left";
  const glassModal =
    "bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-2xl w-full max-w-md overflow-hidden";
  const glassInput =
    "input-field !bg-white/50 !border-white/60 focus:!bg-white/90 focus:!border-[var(--lub-gold)] shadow-sm";

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
    <div className="flex justify-end items-center gap-2">
      {/* 1. EDIT ICON */}
      <button
        onClick={() => setIsEditOpen(true)}
        className="p-2 text-gray-400 hover:text-[var(--lub-gold)] transition-colors"
        title="Edit Cap"
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

      {/* 2. ADJUSTMENT ICON */}
      <button
        onClick={() => setIsStockOpen(true)}
        className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
        title="Manual Adjustment"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-5.25v9"
          />
        </svg>
      </button>

      {/* 3. DELETE ICON */}
      <button
        onClick={() => setIsDeleteOpen(true)}
        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        title="Delete Cap"
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

      {/* --- EDIT MODAL --- */}
      {isEditOpen && (
        <div className={glassBackdrop}>
          <div className={glassModal}>
            <div className="px-6 py-4 border-b border-white/50 bg-white/40 flex justify-between items-center">
              <h2 className="text-lg font-bold text-[var(--lub-dark)]">
                Edit Cap
              </h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-gray-500 hover:text-red-500 text-2xl leading-none font-bold"
              >
                &times;
              </button>
            </div>
            {/* CHANGED FROM action= TO onSubmit= */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <input type="hidden" name="id" value={cap.id} />
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Cap Size
                </label>
                <input
                  className={glassInput}
                  type="text"
                  name="name"
                  defaultValue={cap.name}
                  required
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  disabled={isEditing}
                  className="flex-1 py-2.5 px-4 border border-white/60 bg-white/50 backdrop-blur-sm rounded-xl text-sm font-bold text-gray-700 hover:bg-white/80 transition-all shadow-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="btn-primary flex-1 !rounded-xl shadow-lg shadow-[var(--lub-gold)]/20 flex justify-center items-center gap-2 disabled:opacity-70"
                >
                  {isEditing ? (
                    <>
                      <LoadingSpinner /> Saving...
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

      {/* --- MANUAL ADJUSTMENT MODAL --- */}
      {isStockOpen && (
        <div className={glassBackdrop}>
          <div className={glassModal}>
            <div className="px-6 py-4 border-b border-white/50 bg-white/40 flex justify-between items-center">
              <h2 className="text-lg font-bold text-[var(--lub-dark)]">
                Manual Adjustment
              </h2>
              <button
                onClick={() => setIsStockOpen(false)}
                className="text-gray-500 hover:text-red-500 text-2xl leading-none font-bold"
              >
                &times;
              </button>
            </div>
            <div className="p-6">
              {/* CHANGED FROM action= TO onSubmit= */}
              <form onSubmit={handleAdjustSubmit} className="space-y-4">
                <input type="hidden" name="material_id" value={cap.id} />

                <div className="flex gap-3 p-1 bg-white/40 border border-white/50 rounded-xl shadow-inner backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType("Add Quantity")}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      adjustmentType === "Add Quantity"
                        ? "bg-green-500 text-white shadow-md shadow-green-500/20"
                        : "text-gray-600 hover:bg-white/50"
                    }`}
                  >
                    + Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType("Remove Quantity")}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      adjustmentType === "Remove Quantity"
                        ? "bg-red-500 text-white shadow-md shadow-red-500/20"
                        : "text-gray-600 hover:bg-white/50"
                    }`}
                  >
                    - Remove
                  </button>
                </div>

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
                    max={
                      adjustmentType === "Remove Quantity"
                        ? cap.stock
                        : undefined
                    }
                    required
                  />
                  {adjustmentType === "Remove Quantity" && (
                    <p className="text-[10px] text-red-500 mt-1 font-bold">
                      * Max available: {cap.stock}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Reason
                  </label>
                  <input
                    className={glassInput}
                    type="text"
                    name="reason"
                    placeholder="e.g., Defective batch"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsStockOpen(false)}
                    disabled={isAdjusting}
                    className="flex-1 py-2.5 px-4 border border-white/60 bg-white/50 backdrop-blur-sm rounded-xl text-sm font-bold text-gray-700 hover:bg-white/80 transition-all shadow-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdjusting}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-70 ${
                      adjustmentType === "Remove Quantity"
                        ? "bg-red-500 shadow-red-500/20"
                        : "bg-green-500 shadow-green-500/20"
                    }`}
                  >
                    {isAdjusting ? (
                      <>
                        <LoadingSpinner /> Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
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
                className="flex-1 py-2.5 px-4 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all flex justify-center items-center gap-2 disabled:opacity-70"
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
    </div>
  );
}
