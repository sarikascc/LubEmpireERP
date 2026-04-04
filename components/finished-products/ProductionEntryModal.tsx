"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addProductionEntryAction } from "@/app/actions/finishedProducts";

export default function ProductionEntryModal({
  finishedProducts,
  rawMaterials,
}: {
  finishedProducts: {
    id: string;
    product_name: string;
    grade_name: string;
    unit: string;
  }[];
  rawMaterials: { id: string; name: string; unit: string; stock: number }[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // 🔥 NEW LOADING STATE
  const [selectedProduct, setSelectedProduct] = useState("");
  const [rows, setRows] = useState([{ material_id: "", quantity: "" }]);
  const [errorMsg, setErrorMsg] = useState("");

  const activeProduct = finishedProducts.find((p) => p.id === selectedProduct);

  const addRow = () => {
    setRows([...rows, { material_id: "", quantity: "" }]);
  };

  const removeRow = (index: number) => {
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);
  };

  const handleRowChange = (
    index: number,
    field: "material_id" | "quantity",
    value: string,
  ) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  // 🔥 CHANGED TO e.preventDefault() TO CONTROL THE LOADER
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const validRows = rows.filter(
        (r) => r.material_id !== "" && r.quantity !== "",
      );
      if (validRows.length === 0)
        throw new Error("Please add at least one raw material.");

      const formData = new FormData(e.currentTarget);
      formData.append(
        "raw_materials",
        JSON.stringify(
          validRows.map((r) => ({ ...r, quantity: Number(r.quantity) })),
        ),
      );

      await addProductionEntryAction(formData);

      setIsOpen(false);
      setSelectedProduct("");
      setRows([{ material_id: "", quantity: "" }]);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- STYLES FOR THE GLASSY MODAL UI ---
  const glassBackdrop =
    "fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 text-left";
  const glassModal =
    "bg-[#f4f5f7]/95 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-3xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden";
  const glassInput =
    "w-full p-3 bg-white border border-gray-100 shadow-sm rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all";
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
      <style
        dangerouslySetInnerHTML={{
          __html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`,
        }}
      />
      <button
        onClick={() => setIsOpen(true)}
        className="h-[38px] px-4 bg-[var(--lub-blue)] hover:bg-[#2e376b] text-white text-sm font-bold rounded-md transition-colors shadow-sm shrink-0 flex items-center justify-center gap-2"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        Production Entry
      </button>

      {isOpen && (
        <div
          className={glassBackdrop}
          onClick={() => !isSubmitting && setIsOpen(false)}
        >
          <div className={glassModal} onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 flex justify-between items-center border-b border-gray-200/50 shrink-0">
              <h2 className="text-[15px] font-extrabold text-[#334155]">
                Production Entry
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
              <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-6">
                {errorMsg && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-2xl shadow-sm">
                    ⚠️ {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Finished Product</label>
                    <select
                      className={glassInput}
                      name="finished_product_id"
                      required
                      value={selectedProduct}
                      onChange={(e) => setSelectedProduct(e.target.value)}
                    >
                      <option value="" disabled>
                        -- Select Product & Grade --
                      </option>
                      {finishedProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.product_name} ({p.grade_name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Qty Produced</label>
                    <div className="flex gap-2 items-center">
                      <input
                        className={glassInput}
                        type="number"
                        step="0.01"
                        min="0.1"
                        name="quantity_produced"
                        required
                        disabled={!selectedProduct}
                      />
                      <span className="text-xs font-bold text-gray-500 w-8">
                        {activeProduct?.unit || "Unit"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <h3 className="text-sm font-extrabold text-gray-700 uppercase tracking-wide">
                      Raw Material Consumption
                    </h3>
                    <button
                      type="button"
                      onClick={addRow}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      + Add Material
                    </button>
                  </div>

                  {rows.map((row, index) => {
                    const activeRawMaterial = rawMaterials.find(
                      (rm) => rm.id === row.material_id,
                    );
                    return (
                      <div
                        key={index}
                        className="flex flex-wrap md:flex-nowrap gap-3 items-end"
                      >
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wide">
                            Material Selection
                          </label>
                          <select
                            className={`${glassInput} !py-2.5`}
                            value={row.material_id}
                            onChange={(e) =>
                              handleRowChange(
                                index,
                                "material_id",
                                e.target.value,
                              )
                            }
                            required
                          >
                            <option value="">-- Select Raw Material --</option>
                            {rawMaterials.map((rm) => (
                              <option
                                key={rm.id}
                                value={rm.id}
                                disabled={rm.stock <= 0}
                              >
                                {rm.name} (Max: {rm.stock})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-32 shrink-0 relative">
                          <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wide">
                            Qty Used
                          </label>
                          <input
                            className={`${glassInput} !py-2.5`}
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={activeRawMaterial?.stock}
                            value={row.quantity}
                            onChange={(e) =>
                              handleRowChange(index, "quantity", e.target.value)
                            }
                            required
                            disabled={!row.material_id}
                          />
                        </div>
                        <div className="w-12 shrink-0 pb-3 text-xs font-bold text-gray-500">
                          {activeRawMaterial?.unit || "-"}
                        </div>
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            className="pb-2 text-red-400 hover:text-red-600 p-2"
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
                        )}
                      </div>
                    );
                  })}
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
                  className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner /> Logging...
                    </>
                  ) : (
                    "Log Production"
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
