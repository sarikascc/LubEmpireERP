"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrderAction } from "@/app/actions/orders";

export default function AddOrderModal({
  finishedProducts,
  containers,
  materials,
}: {
  finishedProducts: {
    id: string;
    product_name: string;
    grade_name: string;
    stock: number;
    unit: string;
    cost_per_unit?: number;
  }[];
  containers: {
    id: string;
    name: string;
    pieces_per_box: number;
    capacity_per_piece?: number;
    capacity_unit?: string;
    cost_per_piece?: number;
    box_id?: string;
    cap_id?: string;
    sticker_id?: string;
    cap_quantity?: number;
    sticker_quantity?: number;
  }[];
  materials: {
    id: string;
    cost_per_unit?: number;
  }[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedContainerId, setSelectedContainerId] = useState("");
  const [boxesQty, setBoxesQty] = useState<number | "">("");
  const [rate, setRate] = useState<number | "">("");

  const selectedFP = finishedProducts.find((fp) => fp.id === selectedProductId);
  const selectedContainer = containers.find(
    (c) => c.id === selectedContainerId,
  );

  const piecesPerBox = selectedContainer?.pieces_per_box || 1;
  const totalPieces = (Number(boxesQty) || 0) * piecesPerBox;
  const finalAmount = totalPieces * (Number(rate) || 0);

  let totalCost = 0;
  if (selectedFP && selectedContainer && boxesQty) {
    let bulkVolume =
      Number(selectedContainer.capacity_per_piece || 0) * totalPieces;
    if (selectedContainer.capacity_unit === "ml" && selectedFP.unit === "Ltr")
      bulkVolume /= 1000;
    if (selectedContainer.capacity_unit === "gm" && selectedFP.unit === "KG")
      bulkVolume /= 1000;

    const totalOilCost = bulkVolume * (selectedFP.cost_per_unit || 0);
    const totalBottleCost =
      totalPieces * (selectedContainer.cost_per_piece || 0);

    const reqBoxes = Number(boxesQty);
    const reqStickers = totalPieces * (selectedContainer.sticker_quantity || 0);
    const reqCaps = totalPieces * (selectedContainer.cap_quantity || 0);

    const boxPrice =
      materials?.find((m) => m.id === selectedContainer.box_id)
        ?.cost_per_unit || 0;
    const stickerPrice =
      materials?.find((m) => m.id === selectedContainer.sticker_id)
        ?.cost_per_unit || 0;
    const capPrice =
      materials?.find((m) => m.id === selectedContainer.cap_id)
        ?.cost_per_unit || 0;

    const boxCost = reqBoxes * boxPrice;
    const stickerCost = reqStickers * stickerPrice;
    const capCost = reqCaps * capPrice;

    totalCost =
      totalOilCost + totalBottleCost + boxCost + stickerCost + capCost;
  }

  const estimatedProfit = finalAmount - totalCost;

  const blockInvalidChars = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  };

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const response = await createOrderAction(formData);

      if (response?.error) {
        setErrorMsg(response.error);
        setIsSubmitting(false);
        return;
      }

      setIsOpen(false);
      setBoxesQty("");
      setRate("");
      setSelectedProductId("");
      setSelectedContainerId("");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      setErrorMsg("An unexpected server error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const glassBackdrop =
    "fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 text-left";
  const glassModal =
    "bg-white/70 backdrop-blur-xl border border-white/60 shadow-sm rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden";
  const glassInput =
    "w-full p-2.5 bg-white/50 border border-white/60 rounded-xl text-sm focus:bg-white focus:border-[var(--lub-gold)] outline-none transition-all shadow-sm";
  const labelClass = "block text-sm font-bold text-gray-700 mb-1.5";

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          setErrorMsg("");
        }}
        className="h-[38px] px-4 bg-[var(--lub-gold)] hover:bg-yellow-500 text-white text-sm font-bold rounded-md transition-colors shadow-sm shrink-0 flex items-center justify-center gap-2"
      >
        + Create Sales Order
      </button>

      {isOpen && (
        <div className={glassBackdrop}>
          <div className={glassModal}>
            <div className="px-6 py-4 border-b border-white/50 bg-white/40 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-[var(--lub-dark)]">
                Create New Sales Order
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
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-medium">
                    ⚠️ {errorMsg}
                  </div>
                )}

                <div>
                  <label className={labelClass}>Customer / Client Name</label>
                  <input
                    type="text"
                    name="customer_name"
                    required
                    placeholder="e.g., Reliance Industries"
                    className={glassInput}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Finished Product (Oil)</label>
                    <select
                      name="finished_product_id"
                      required
                      className={glassInput}
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                    >
                      <option value="">-- Select Product --</option>
                      {finishedProducts.map((fp) => (
                        <option key={fp.id} value={fp.id}>
                          {fp.product_name} ({fp.grade_name}) -{" "}
                          {parseFloat(Number(fp.stock).toFixed())} {fp.unit}{" "}
                          available
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>
                      Packaging (Bottle / Bucket)
                    </label>
                    <select
                      name="container_id"
                      required
                      className={glassInput}
                      value={selectedContainerId}
                      onChange={(e) => setSelectedContainerId(e.target.value)}
                    >
                      <option value="">-- Select Packaging --</option>
                      {containers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Quantity (Boxes)</label>
                    <input
                      type="number"
                      name="boxes_quantity"
                      min="1"
                      required
                      onKeyDown={blockInvalidChars}
                      placeholder="e.g., 50"
                      className={glassInput}
                      value={boxesQty}
                      onChange={(e) =>
                        setBoxesQty(
                          e.target.value ? Number(e.target.value) : "",
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Rate per Piece (₹)</label>
                    <input
                      type="number"
                      name="rate_per_piece"
                      step="0.01"
                      min="0.01"
                      required
                      onKeyDown={blockInvalidChars}
                      placeholder="e.g., 1500.00"
                      className={glassInput}
                      value={rate}
                      onChange={(e) =>
                        setRate(e.target.value ? Number(e.target.value) : "")
                      }
                    />
                  </div>
                </div>

                {/* 🔥 NEW: AMOUNT & PROFIT DISPLAY 🔥 */}
                {selectedProductId &&
                selectedContainerId &&
                boxesQty &&
                rate ? (
                  <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-xl flex flex-col gap-3 shadow-inner">
                    <div className="flex justify-between items-center border-b border-green-200/60 pb-3">
                      <span className="font-bold text-green-800">
                        Total Sale Amount:
                      </span>
                      <span className="font-black text-lg text-green-900">
                        ₹
                        {finalAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="font-bold text-green-900">
                        Estimated Net Profit:
                      </span>
                      <span
                        className={`font-black text-xl tracking-tight ${estimatedProfit >= 0 ? "text-green-700" : "text-red-600"}`}
                      >
                        ₹
                        {estimatedProfit.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="px-6 py-4 border-t border-white/50 bg-white/40 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-white/60 bg-white/50 rounded-xl text-sm font-bold text-gray-700 hover:bg-white/80 transition-all shadow-sm"
                >
                  Cancel
                </button>
                <input
                  type="hidden"
                  name="calculated_profit"
                  value={estimatedProfit}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 !rounded-xl shadow-lg shadow-[var(--lub-gold)]/20 disabled:opacity-50"
                >
                  {isSubmitting ? "Processing..." : "Confirm Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
