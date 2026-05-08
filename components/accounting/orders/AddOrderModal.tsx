"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createOrderAction } from "@/app/actions/orders";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export default function AddOrderModal({
  finishedProducts,
  containers,
  materials,
  stickers,
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
    cap_quantity?: number;
  }[];
  materials: {
    id: string;
    cost_per_unit?: number;
  }[];
  stickers: {
    id: string;
    name: string;
    cost_per_unit?: number;
    stock: number;
  }[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [orderDate, setOrderDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedContainerId, setSelectedContainerId] = useState("");
  const [boxesQty, setBoxesQty] = useState<number | "">("");
  const [rate, setRate] = useState<number | "">("");

  // Sticker state (only ID needed now, quantity defaults to 1)
  const [selectedStickerId, setSelectedStickerId] = useState("");

  const selectedFP = finishedProducts.find((fp) => fp.id === selectedProductId);
  const selectedContainer = containers.find(
    (c) => c.id === selectedContainerId,
  );
  const selectedSticker = stickers.find((s) => s.id === selectedStickerId);

  const piecesPerBox = selectedContainer?.pieces_per_box || 1;
  const totalPieces = (Number(boxesQty) || 0) * piecesPerBox;
  const finalAmount = totalPieces * (Number(rate) || 0);

  let bulkVolume = 0;
  let totalOilCost = 0;
  let totalBottleCost = 0;
  let boxCost = 0;
  let capCost = 0;
  let stickerCost = 0;
  let reqBoxes = 0;
  let reqCaps = 0;
  let reqStickers = 0;
  let oilCpu = 0;
  let bottleCpu = 0;
  let boxPrice = 0;
  let capPrice = 0;
  let stickerPrice = 0;

  let totalCost = 0;
  if (selectedFP && selectedContainer && boxesQty) {
    bulkVolume =
      Number(selectedContainer.capacity_per_piece || 0) * totalPieces;
    if (selectedContainer.capacity_unit === "ml" && selectedFP.unit === "Ltr")
      bulkVolume /= 1000;
    if (selectedContainer.capacity_unit === "gm" && selectedFP.unit === "KG")
      bulkVolume /= 1000;

    oilCpu = selectedFP.cost_per_unit || 0;
    bottleCpu = selectedContainer.cost_per_piece || 0;
    totalOilCost = bulkVolume * oilCpu;
    totalBottleCost = totalPieces * bottleCpu;

    reqBoxes = Number(boxesQty);
    reqCaps = totalPieces * (selectedContainer.cap_quantity || 0);
    // Hardcoded to 1 sticker per piece when a sticker is selected
    reqStickers = selectedStickerId ? totalPieces * 1 : 0;

    boxPrice =
      materials?.find((m) => m.id === selectedContainer.box_id)
        ?.cost_per_unit || 0;
    capPrice =
      materials?.find((m) => m.id === selectedContainer.cap_id)
        ?.cost_per_unit || 0;
    stickerPrice = selectedSticker?.cost_per_unit || 0;

    boxCost = reqBoxes * boxPrice;
    capCost = reqCaps * capPrice;
    stickerCost = reqStickers * stickerPrice;

    totalCost =
      totalOilCost + totalBottleCost + boxCost + stickerCost + capCost;
  }

  const estimatedProfit = finalAmount - totalCost;

  const formatInr = (n: number) =>
    n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const productOptions = useMemo(
    () =>
      finishedProducts.map((fp) => ({
        value: fp.id,
        label: `${fp.product_name} (${fp.grade_name}) - ${parseFloat(Number(fp.stock).toFixed())} ${fp.unit} available`,
        keywords: `${fp.product_name} ${fp.grade_name} ${fp.unit}`,
      })),
    [finishedProducts],
  );

  const containerOptions = useMemo(
    () =>
      containers.map((c) => {
        const cap =
          c.capacity_per_piece != null
            ? `Capacity : ${c.capacity_per_piece} ${c.capacity_unit ?? ""}`
            : "";
        return {
          value: c.id,
          label: [c.name.trim(), cap ? `(${cap})` : ""].filter(Boolean).join(" "),
          keywords: `${c.name} ${c.capacity_unit ?? ""} ${c.capacity_per_piece ?? ""}`,
        };
      }),
    [containers],
  );

  const stickerOptions = useMemo(
    () =>
      stickers.map((s) => ({
        value: s.id,
        label: `${s.name} (${s.stock} in stock)`,
        keywords: s.name,
      })),
    [stickers],
  );

  const blockInvalidChars = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");
    if (!selectedProductId) {
      setErrorMsg("Please select a finished product.");
      return;
    }
    if (!selectedContainerId) {
      setErrorMsg("Please select packaging.");
      return;
    }
    if (!orderDate) {
      setErrorMsg("Please select an order date.");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
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
      setSelectedStickerId("");
      // reset back to today for the next order
      {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        setOrderDate(`${yyyy}-${mm}-${dd}`);
      }
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
        onClick={() => {
          setIsOpen(true);
          setErrorMsg("");
        }}
        className="h-[38px] px-4 bg-[var(--lub-gold)] hover:bg-yellow-500 text-white text-sm font-bold rounded-md transition-colors shadow-sm shrink-0 flex items-center justify-center gap-2"
      >
        + Create Sales Order
      </button>

      {isOpen && (
        <div
          className={glassBackdrop}
          onClick={() => !isSubmitting && setIsOpen(false)}
        >
          <div className={glassModal} onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 flex justify-between items-center border-b border-gray-200/50 shrink-0">
              <h2 className="text-[15px] font-extrabold text-[#334155]">
                Create New Sales Order
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
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {errorMsg && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-2xl shadow-sm">
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

                <div>
                  <label className={labelClass}>Order Date</label>
                  <input
                    type="date"
                    name="order_date"
                    required
                    className={glassInput}
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Finished Product (Oil)</label>
                    <SearchableSelect
                      name="finished_product_id"
                      value={selectedProductId}
                      onChange={setSelectedProductId}
                      options={productOptions}
                      placeholder="-- Select product (search) --"
                      searchPlaceholder="Search by name, grade, unit…"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>
                      Packaging (Bottle / Bucket)
                    </label>
                    <SearchableSelect
                      name="container_id"
                      value={selectedContainerId}
                      onChange={setSelectedContainerId}
                      options={containerOptions}
                      placeholder="-- Select packaging (search) --"
                      searchPlaceholder="Search by bottle name, capacity…"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>
                      Sticker / Label Design
                    </label>
                    <SearchableSelect
                      name="sticker_id"
                      value={selectedStickerId}
                      onChange={setSelectedStickerId}
                      options={stickerOptions}
                      placeholder="-- No sticker needed (search if adding) --"
                      searchPlaceholder="Search sticker name…"
                      optional
                      emptyOptionLabel="-- No Sticker Needed --"
                    />
                    {selectedStickerId && (
                      <input type="hidden" name="sticker_quantity" value="1" />
                    )}
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
                      placeholder="e.g., 150.00"
                      className={glassInput}
                      value={rate}
                      onChange={(e) =>
                        setRate(e.target.value ? Number(e.target.value) : "")
                      }
                    />
                  </div>
                </div>

                {selectedProductId &&
                selectedContainerId &&
                boxesQty &&
                rate ? (
                  <div className="mt-4 p-5 bg-green-50 border border-green-200 rounded-2xl flex flex-col gap-4 shadow-inner text-sm">
                    <div>
                      <p className="text-[11px] font-extrabold text-green-800 uppercase tracking-wide mb-2">
                        Quantity & revenue
                      </p>
                      <div className="space-y-1.5 text-green-900/90">
                        <div className="flex justify-between gap-3">
                          <span className="text-gray-600 font-medium">
                            Total pieces
                          </span>
                          <span className="font-semibold tabular-nums text-right">
                            {totalPieces.toLocaleString("en-IN")}{" "}
                            <span className="text-gray-500 font-normal">
                              ({Number(boxesQty)} box
                              {Number(boxesQty) !== 1 ? "es" : ""} ×{" "}
                              {piecesPerBox} pcs)
                            </span>
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-gray-600 font-medium">
                            Rate per piece
                          </span>
                          <span className="font-semibold tabular-nums">
                            ₹{formatInr(Number(rate) || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-green-200/70 pt-3">
                      <p className="text-[11px] font-extrabold text-green-800 uppercase tracking-wide mb-2">
                        Cost breakdown (COGS)
                      </p>
                      <div className="space-y-2 text-green-900/90">
                        <div className="flex justify-between gap-3 items-start">
                          <span className="text-gray-600 font-medium shrink min-w-0">
                            Oil (bulk)
                            <span className="block text-[11px] font-normal text-gray-500 normal-case">
                              {bulkVolume.toLocaleString("en-IN", {
                                maximumFractionDigits: 4,
                              })}{" "}
                              {selectedFP?.unit}
                              {" × "}₹{formatInr(oilCpu)} / {selectedFP?.unit}
                            </span>
                          </span>
                          <span className="font-semibold tabular-nums shrink-0">
                            ₹{formatInr(totalOilCost)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3 items-start">
                          <span className="text-gray-600 font-medium shrink min-w-0">
                            Empty packaging
                            <span className="block text-[11px] font-normal text-gray-500 normal-case">
                              {totalPieces.toLocaleString("en-IN")} pcs × ₹
                              {formatInr(bottleCpu)} / pc
                            </span>
                          </span>
                          <span className="font-semibold tabular-nums shrink-0">
                            ₹{formatInr(totalBottleCost)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3 items-start">
                          <span className="text-gray-600 font-medium shrink min-w-0">
                            Cartons / boxes
                            <span className="block text-[11px] font-normal text-gray-500 normal-case">
                              {selectedContainer?.box_id
                                ? `${reqBoxes} × ₹${formatInr(boxPrice)}`
                                : "Not linked to a box material"}
                            </span>
                          </span>
                          <span className="font-semibold tabular-nums shrink-0">
                            ₹{formatInr(boxCost)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3 items-start">
                          <span className="text-gray-600 font-medium shrink min-w-0">
                            Caps
                            <span className="block text-[11px] font-normal text-gray-500 normal-case">
                              {selectedContainer?.cap_id
                                ? `${reqCaps.toLocaleString("en-IN")} × ₹${formatInr(capPrice)}`
                                : "Not linked to a cap material"}
                            </span>
                          </span>
                          <span className="font-semibold tabular-nums shrink-0">
                            ₹{formatInr(capCost)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3 items-start">
                          <span className="text-gray-600 font-medium shrink min-w-0">
                            Stickers
                            <span className="block text-[11px] font-normal text-gray-500 normal-case">
                              {selectedStickerId
                                ? `${reqStickers.toLocaleString("en-IN")} × ₹${formatInr(stickerPrice)} (1 / pc)`
                                : "None selected"}
                            </span>
                          </span>
                          <span className="font-semibold tabular-nums shrink-0">
                            ₹{formatInr(stickerCost)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3 pt-2 border-t border-green-200/60 font-extrabold text-green-900">
                          <span>Total COGS</span>
                          <span className="tabular-nums">₹{formatInr(totalCost)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-green-200/60 pt-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-green-800 text-sm uppercase tracking-wide">
                          Total sale amount
                        </span>
                        <span className="font-black text-xl text-green-900 tabular-nums">
                          ₹{formatInr(finalAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-green-900 text-sm uppercase tracking-wide">
                          Estimated net profit
                        </span>
                        <span
                          className={`font-black text-2xl tracking-tight tabular-nums ${estimatedProfit >= 0 ? "text-green-700" : "text-red-600"}`}
                        >
                          {estimatedProfit < 0 ? "- ₹" : "₹"}
                          {formatInr(Math.abs(estimatedProfit))}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-snug">
                        Profit = sale amount − COGS (oil + packaging + boxes +
                        caps + stickers), using current cost rates in master
                        data.
                      </p>
                    </div>
                  </div>
                ) : null}
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
                <input
                  type="hidden"
                  name="calculated_profit"
                  value={estimatedProfit}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 bg-[var(--lub-gold)] text-white font-bold rounded-xl shadow-md hover:brightness-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner /> Processing...
                    </>
                  ) : (
                    "Confirm Order"
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