"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";

export default function OrderFilters({
  children,
}: {
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("search")?.toString() || "";
  const currentStart = searchParams.get("startDate")?.toString() || "";
  const currentEnd = searchParams.get("endDate")?.toString() || "";

  const [searchTerm, setSearchTerm] = useState(currentSearch);
  const [startDate, setStartDate] = useState(currentStart);
  const [endDate, setEndDate] = useState(currentEnd);

  useEffect(() => {
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

  const hasActiveFilters = searchTerm || startDate || endDate;

  return (
    <div className="flex flex-col xl:flex-row items-center justify-between gap-4 w-full">
      {/* --- LEFT SIDE: Search Input --- */}
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
          placeholder="Search customer or product..."
          className="w-full h-[38px] pl-9 pr-4 text-sm text-gray-700 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-[var(--lub-gold)] focus:ring-1 focus:ring-[var(--lub-gold)] shadow-sm transition-colors"
        />
      </div>

      {/* --- RIGHT SIDE: Date Filters, Reset, & Action Button --- */}
      <div className="flex items-center gap-3 shrink-0 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0">
        {/* 1. Date Range Group */}
        <div className="flex items-center gap-2 shrink-0 bg-gray-50 border border-gray-200 rounded-md p-1 h-[38px]">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              applyFilters(searchTerm, e.target.value, endDate);
            }}
            className="text-xs text-gray-600 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
            title="Start Date"
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
            title="End Date"
          />
        </div>

        {/* 2. Reset Filters Button (Appears between Date and Generate Button) */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="h-[38px] px-4 flex items-center gap-2 text-sm font-medium text-[var(--lub-blue, #3F4A90)] bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-sm shrink-0"
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

        {/* 3. Generate New Order Button (children passed from page.tsx) */}
        {children}
      </div>
    </div>
  );
}
