"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteOrderAction, editOrderAction } from "@/app/actions/orders";

export default function OrderRowActions({
  order,
  stickers,
}: {
  order: any;
  stickers: {
    id: string;
    name: string;
    cost_per_unit?: number;
    stock: number;
    type?: string;
  }[];
}) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // 🔥 Sticker state (only ID needed now)
  const [selectedStickerId, setSelectedStickerId] = useState(
    order.sticker_id || "",
  );

  const handleDeleteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDeleting(true);
    const fd = new FormData(e.currentTarget);
    try {
      await deleteOrderAction(fd);
      setIsDeleteOpen(false);
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsEditing(true);
    const fd = new FormData(e.currentTarget);
    try {
      await editOrderAction(fd);
      setIsEditOpen(false);
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Something went wrong");
    } finally {
      setIsEditing(false);
    }
  };

  const glassBackdrop =
    "fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 text-left";
  const glassModal =
    "bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-2xl w-full max-w-lg overflow-hidden";
  const glassInput =
    "input-field !bg-white/50 !border-white/60 focus:!bg-white/90 focus:!border-[var(--lub-gold)] shadow-sm w-full";

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
    <div className="flex justify-center items-center gap-2">
      {/* --- EDIT ICON --- */}
      <button
        onClick={() => setIsEditOpen(true)}
        className="p-2 text-gray-400 hover:text-[var(--lub-gold)] transition-colors"
        title="Edit Order"
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

      {/* --- DELETE ICON --- */}
      <button
        onClick={() => setIsDeleteOpen(true)}
        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        title="Delete Order & Restock Inventory"
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

      {/* ================= EDIT MODAL ================= */}
      {isEditOpen && (
        <div className={glassBackdrop}>
          <div className={glassModal}>
            <div className="px-6 py-4 border-b border-white/50 bg-white/40 flex justify-between items-center">
              <h2 className="text-lg font-bold text-[var(--lub-dark)]">
                Edit Order
              </h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-gray-500 hover:text-red-500 text-2xl leading-none font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              <input type="hidden" name="id" value={order.id} />

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Customer Name
                </label>
                <input
                  className={glassInput}
                  type="text"
                  name="customer_name"
                  defaultValue={order.customer_name}
                  required
                />
              </div>

              {/* 🔥 STICKER SELECTION AREA IN EDIT MODAL */}
              <div className="flex gap-4 bg-white/40 p-4 border border-white/60 rounded-2xl shadow-sm">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Sticker / Label Design
                  </label>
                  <select
                    name="sticker_id"
                    className={glassInput}
                    value={selectedStickerId}
                    onChange={(e) => setSelectedStickerId(e.target.value)}
                  >
                    <option value="">-- No Sticker Needed --</option>
                    {stickers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.stock} in stock)
                      </option>
                    ))}
                  </select>
                </div>

                {/* 🔥 HIDDEN STICKER QUANTITY (DEFAULT 1) */}
                {selectedStickerId && (
                  <input type="hidden" name="sticker_quantity" value="1" />
                )}

                {/* 🔥 COMMENTED OUT STICKER QUANTITY FIELD 
                <div className="w-24 shrink-0">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Qty / Pc</label>
                  <input
                    type="number"
                    className={glassInput}
                    min="1"
                    value={1}
                    disabled={true}
                  />
                </div>
                */}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Qty (Cartons/Boxes)
                  </label>
                  <input
                    className={glassInput}
                    type="number"
                    name="boxes_quantity"
                    min="1"
                    defaultValue={order.boxes_quantity}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Rate per Piece (₹)
                  </label>
                  <input
                    className={glassInput}
                    type="number"
                    name="rate_per_piece"
                    step="0.01"
                    min="0.01"
                    defaultValue={order.rate_per_piece}
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
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
                      <LoadingSpinner /> Updating...
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

      {/* ================= DELETE MODAL ================= */}
      {isDeleteOpen && (
        <div className={`${glassBackdrop} text-center`}>
          <div className={`${glassModal} p-8 !max-w-sm`}>
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
            <h3 className="text-xl font-extrabold text-gray-900 drop-shadow-sm">
              Delete Order?
            </h3>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              This will permanently delete the order and{" "}
              <strong className="text-green-600">refund all stock</strong> back
              into your inventory.
            </p>

            <form onSubmit={handleDeleteSubmit} className="flex gap-3 mt-8">
              <input type="hidden" name="id" value={order.id} />
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 border border-white/60 bg-white/50 backdrop-blur-sm rounded-xl text-sm font-bold text-gray-700 hover:bg-white/80 transition-all shadow-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all flex justify-center items-center gap-2 disabled:opacity-70"
              >
                {isDeleting ? (
                  <>
                    <LoadingSpinner /> Reversing...
                  </>
                ) : (
                  "Delete & Refund"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
