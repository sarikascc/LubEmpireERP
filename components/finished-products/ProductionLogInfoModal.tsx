"use client";

import { useState } from "react";

export default function ProductionLogInfoModal({ log }: { log: any }) {
  const [isOpen, setIsOpen] = useState(false);

  // Exact styles matched from your CapRowActions
  const glassBackdrop =
    "fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[70] p-4 text-left";
  const glassModal =
    "bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-2xl w-full max-w-md flex flex-col overflow-hidden";

  return (
    <>
      {/* 1. THE TRIGGER ICON */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-400 hover:text-[var(--lub-gold)] transition-colors flex items-center justify-center mx-auto focus:outline-none"
        title="View Raw Materials"
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
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {/* 2. THE MODAL */}
      {isOpen && (
        <div className={glassBackdrop} onClick={() => setIsOpen(false)}>
          <div className={glassModal} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/50 bg-white/40 flex justify-between items-center">
              <h2 className="text-lg font-bold text-[var(--lub-dark)]">
                Raw Materials Used
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-red-500 text-2xl leading-none font-bold"
              >
                &times;
              </button>
            </div>

            {/* List Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {log.production_material_consumption?.length > 0 ? (
                log.production_material_consumption.map(
                  (pmc: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-4 bg-white/50 border border-white/60 shadow-sm rounded-xl"
                    >
                      <span className="font-bold text-gray-700 text-sm">
                        {pmc.materials?.name}
                      </span>
                      <div className="text-right flex items-baseline gap-1">
                        {/* 🔥 Removed blue color, set to dark grey */}
                        <span className="font-black text-gray-800 text-lg">
                          {pmc.quantity_used}
                        </span>
                        <span className="text-xs text-gray-500 font-bold">
                          {pmc.materials?.unit}
                        </span>
                      </div>
                    </div>
                  ),
                )
              ) : (
                <p className="text-sm text-gray-500 text-center py-4 font-medium">
                  No raw materials recorded for this batch.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/50 bg-white/40 flex justify-end shrink-0">
              <button
                onClick={() => setIsOpen(false)}
                className="py-2.5 px-6 border border-white/60 bg-white/50 backdrop-blur-sm rounded-xl text-sm font-bold text-gray-700 hover:bg-white/80 transition-all shadow-sm w-full md:w-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
