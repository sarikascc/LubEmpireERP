"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { editProductionEntryAction } from "@/app/actions/finishedProducts";

export default function EditProductionEntryModal({
  log,
  finishedProducts,
  rawMaterials,
}: {
  log: any;
  finishedProducts: any[];
  rawMaterials: any[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill with existing log data
  const [selectedProduct, setSelectedProduct] = useState(
    log.finished_product_id,
  );
  const [errorMsg, setErrorMsg] = useState("");

  // Map the existing consumptions to the rows state
  const [rows, setRows] = useState(() => {
    if (
      log.production_material_consumption &&
      log.production_material_consumption.length > 0
    ) {
      return log.production_material_consumption.map((c: any) => ({
        material_id: c.raw_material_id,
        quantity: c.quantity_used.toString(),
        input_unit: c.materials?.unit || "",
      }));
    }
    return [{ material_id: "", quantity: "", input_unit: "" }];
  });

  const activeProduct = finishedProducts.find((p) => p.id === selectedProduct);

  const addRow = () =>
    setRows([...rows, { material_id: "", quantity: "", input_unit: "" }]);

  const removeRow = (index: number) => {
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);
  };

  const handleRowChange = (
    index: number,
    field: "material_id" | "quantity" | "input_unit",
    value: string,
  ) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    if (field === "material_id") {
      const mat = rawMaterials.find((m) => m.id === value);
      newRows[index].input_unit = mat?.unit || "";
    }
    setRows(newRows);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const validRows = rows.filter(
        (r: any) => r.material_id !== "" && r.quantity !== "",
      );
      if (validRows.length === 0)
        throw new Error("Please add at least one raw material.");

      // 🔥 AUTO-CONVERT UNITS (Now supporting Grams, Gm, ml, Ml)
      const processedRows = validRows.map((r: any) => {
        let finalQty = Number(r.quantity);
        const unitLower = r.input_unit?.toLowerCase();

        if (
          unitLower === "grams" ||
          unitLower === "gram" ||
          unitLower === "gm" ||
          unitLower === "ml"
        ) {
          finalQty = finalQty / 1000;
        }
        return { material_id: r.material_id, quantity: finalQty };
      });

      const formData = new FormData(e.currentTarget);
      formData.append("log_id", log.id);
      formData.set("raw_materials", JSON.stringify(processedRows));

      await editProductionEntryAction(formData);

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- STYLES TO MATCH YOUR SCREENSHOT EXACTLY ---
  const glassBackdrop =
    "fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 text-left";
  const glassModal =
    "bg-[#f4f6f8] shadow-2xl rounded-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden font-sans border border-white";
  const inputClass =
    "w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all shadow-sm";
  const labelClass =
    "block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider";

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
        className="p-1.5 text-gray-400 hover:text-[#2563eb] transition-colors focus:outline-none"
        title="Edit Production"
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

      {isOpen && (
        <div
          className={glassBackdrop}
          onClick={() => !isSubmitting && setIsOpen(false)}
        >
          <div className={glassModal} onClick={(e) => e.stopPropagation()}>
            <div className="px-8 py-5 flex justify-between items-center border-b border-gray-200/60 bg-white/50 shrink-0">
              <h2 className="text-[17px] font-extrabold text-[#1e293b]">
                Edit Production Entry
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-2xl leading-none focus:outline-none"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="p-8 space-y-6 overflow-y-auto">
                {errorMsg && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-xl shadow-sm">
                    ⚠️ {errorMsg}
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-5">
                  <div className="flex-1">
                    <label className={labelClass}>Finished Product</label>
                    <select
                      className={inputClass}
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
                  <div className="w-full md:w-56 shrink-0">
                    <label className={labelClass}>Qty Produced</label>
                    <div className="flex gap-3 items-center">
                      <input
                        className={inputClass}
                        type="number"
                        step="0.01"
                        min="0.1"
                        name="quantity_produced"
                        required
                        defaultValue={log.quantity_produced}
                        disabled={!selectedProduct}
                      />
                      <span className="text-sm font-bold text-gray-500 w-8">
                        {activeProduct?.unit || "Unit"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-5">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                    <h3 className="text-[13px] font-extrabold text-[#1e293b] uppercase tracking-wider">
                      Raw Material Consumption
                    </h3>
                    <button
                      type="button"
                      onClick={addRow}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800"
                    >
                      + Add Material
                    </button>
                  </div>

                  {rows.map((row: any, index: any) => {
                    const activeRawMaterial = rawMaterials.find(
                      (rm) => rm.id === row.material_id,
                    );
                    const unitLower = activeRawMaterial?.unit?.toLowerCase();
                    const isKg = unitLower === "kg";
                    const isLtr = unitLower === "ltr" || unitLower === "liter";

                    return (
                      <div key={index} className="flex gap-4 items-center">
                        <div className="flex-1">
                          <label className={labelClass}>
                            Material Selection
                          </label>
                          <select
                            className={inputClass}
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
                              <option key={rm.id} value={rm.id}>
                                {rm.name} (Max: {Number(rm.stock).toFixed(2)}{" "}
                                {rm.unit})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-32 shrink-0">
                          <label className={labelClass}>Qty Used</label>
                          <input
                            className={inputClass}
                            type="number"
                            step="0.001"
                            min="0.01"
                            value={row.quantity}
                            onChange={(e) =>
                              handleRowChange(index, "quantity", e.target.value)
                            }
                            required
                            disabled={!row.material_id}
                          />
                        </div>
                        <div className="w-24 shrink-0 pt-6">
                          {isKg ? (
                            <select
                              className="w-full text-sm font-bold text-gray-500 bg-transparent border-none focus:ring-0 cursor-pointer outline-none"
                              value={row.input_unit}
                              onChange={(e) =>
                                handleRowChange(
                                  index,
                                  "input_unit",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="Kg">Kg</option>
                              <option value="Gm">Gm</option>
                            </select>
                          ) : isLtr ? (
                            <select
                              className="w-full text-sm font-bold text-gray-500 bg-transparent border-none focus:ring-0 cursor-pointer outline-none"
                              value={row.input_unit}
                              onChange={(e) =>
                                handleRowChange(
                                  index,
                                  "input_unit",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="Ltr">Ltr</option>
                              <option value="Ml">Ml</option>
                            </select>
                          ) : (
                            <div className="text-sm font-bold text-gray-500 w-full px-2">
                              {activeRawMaterial?.unit || "-"}
                            </div>
                          )}
                        </div>

                        {rows.length > 1 && (
                          <div className="pt-6">
                            <button
                              type="button"
                              onClick={() => removeRow(index)}
                              className="text-red-400 hover:text-red-600 focus:outline-none"
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
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-6 bg-white flex gap-4 shrink-0 rounded-b-2xl border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 px-4 bg-white text-[#1e293b] font-extrabold rounded-xl border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-3.5 px-4 bg-[#2563eb] text-white font-extrabold rounded-xl shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner /> Saving...
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
    </>
  );
}
