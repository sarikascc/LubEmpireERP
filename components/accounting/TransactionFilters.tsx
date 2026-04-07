"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function TransactionFilters({
  dataToExport,
}: {
  dataToExport: any[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [isMounted, setIsMounted] = useState(false);

  const currentSearch = searchParams.get("search")?.toString() || "";
  const currentStart = searchParams.get("startDate")?.toString() || "";
  const currentEnd = searchParams.get("endDate")?.toString() || "";

  const [searchTerm, setSearchTerm] = useState(currentSearch);
  const [startDate, setStartDate] = useState(currentStart);
  const [endDate, setEndDate] = useState(currentEnd);

  useEffect(() => {
    setIsMounted(true);
    setSearchTerm(currentSearch);
    setStartDate(currentStart);
    setEndDate(currentEnd);
  }, [currentSearch, currentStart, currentEnd]);

  const applyFilters = (
    newSearch: string,
    newStart: string,
    newEnd: string,
  ) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    if (newSearch) params.set("search", newSearch);
    else params.delete("search");
    if (newStart) params.set("startDate", newStart);
    else params.delete("startDate");
    if (newEnd) params.set("endDate", newEnd);
    else params.delete("endDate");

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    applyFilters("", "", "");
  };

  const handleExportExcel = () => {
    if (!dataToExport || dataToExport.length === 0) {
      alert("No data available to export.");
      return;
    }

    const rows = dataToExport.map((entry) => {
      let partyName = "-";
      let cleanDesc = entry.description || "";
      const match = (entry.description || "").match(
        /^(.*?)\s*-\s*(.*?)\s*(\(.*)$/,
      );
      if (match) {
        partyName = match[2].trim();
        cleanDesc = match[3].trim().replace(/^\(|\)$/g, "");
      }

      const dateObj = new Date(entry.created_at);
      const safeDate = `${String(dateObj.getDate()).padStart(2, "0")}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${dateObj.getFullYear()}`;

      return {
        Date: safeDate,
        Type: entry.entry_type === "Income" ? "SALES" : "PURCHASE",
        "Party Name": partyName,
        Description: cleanDesc,
        Qty: entry.quantity || 0,
        Unit: entry.unit || "PCS",
        // 🔥 FIX: Ensure Rate, Amount, and Profit are perfectly rounded to 2 decimal places in Excel
        "Rate (₹)":
          entry.rate != null ? Number(Number(entry.rate).toFixed(2)) : 0,
        "Amount (₹)":
          entry.amount != null ? Number(Number(entry.amount).toFixed(2)) : 0,
        "Profit/Loss (₹)":
          entry.profit != null ? Number(Number(entry.profit).toFixed(2)) : "-",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

    worksheet["!cols"] = [
      { wch: 12 },
      { wch: 10 },
      { wch: 25 },
      { wch: 40 },
      { wch: 8 },
      { wch: 8 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
    ];

    const filename = `LubEmpire_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  if (!isMounted) {
    return (
      <div className="h-[38px] w-full bg-gray-50 rounded-md animate-pulse"></div>
    );
  }

  const hasActiveFilters = searchTerm || startDate || endDate;

  return (
    <div className="flex flex-col xl:flex-row items-center justify-between gap-4 w-full">
      <div className="relative flex-1 w-full max-w-2xl">
        <svg
          className="w-[18px] h-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            applyFilters(e.target.value, startDate, endDate);
          }}
          placeholder="Search description or party..."
          className="w-full h-[38px] pl-9 pr-4 text-sm text-gray-700 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-[var(--lub-gold)] focus:ring-1 focus:ring-[var(--lub-gold)] shadow-sm transition-colors"
        />
      </div>

      <div className="flex items-center gap-3 shrink-0 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0">
        <div className="flex items-center gap-2 shrink-0 bg-gray-50 border border-gray-200 rounded-md p-1 h-[38px]">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              applyFilters(searchTerm, e.target.value, endDate);
            }}
            className="text-xs text-gray-600 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
          />
          <span className="text-gray-300 font-bold text-xs">-</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              applyFilters(searchTerm, startDate, e.target.value);
            }}
            className="text-xs text-gray-600 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
          />
        </div>

        <button
          onClick={handleExportExcel}
          className="h-[38px] px-4 flex items-center gap-2 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors shadow-sm shrink-0"
        >
          <svg
            className="w-4 h-4 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export Excel
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="h-[38px] px-4 flex items-center gap-2 text-sm font-medium text-[#3F4A90] bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-sm shrink-0"
          >
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );
}
