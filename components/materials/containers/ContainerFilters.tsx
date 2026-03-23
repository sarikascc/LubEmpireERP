"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";

export default function ContainerFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("search")?.toString() || "";
  const currentType = searchParams.get("typeFilter")?.toString() || "all";

  const [searchTerm, setSearchTerm] = useState(currentSearch);

  useEffect(() => {
    setSearchTerm(currentSearch);
  }, [currentSearch]);

  // --- HANDLE TEXT SEARCH ---
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");

    if (term) {
      params.set("search", term);
    } else {
      params.delete("search");
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  // --- HANDLE TYPE DROPDOWN ---
  const handleTypeChange = (type: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");

    if (type !== "all") {
      params.set("typeFilter", type);
    } else {
      params.delete("typeFilter");
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  // --- HANDLE RESET ---
  const handleReset = () => {
    setSearchTerm("");
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("search");
      params.delete("typeFilter");
      params.set("page", "1");
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    // 'justify-between' forces the search bar left, and the dropdown right!
    <div className="flex flex-1 items-center justify-between gap-4 w-full">
      {/* 1. SEARCH INPUT (Anchored to the left) */}
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
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search containers..."
          className="w-full h-[38px] pl-9 pr-8 text-sm text-gray-700 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-[var(--lub-gold)] focus:ring-1 focus:ring-[var(--lub-gold)] shadow-sm transition-colors"
        />

        {isPending && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-[var(--lub-gold)] rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* 2. FILTER CONTROLS GROUP (Anchored to the right) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* TYPE DROPDOWN */}
        <select
          value={currentType}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="h-[38px] px-3 text-sm text-gray-700 font-medium bg-white border border-gray-200 rounded-md focus:outline-none focus:border-[var(--lub-gold)] focus:ring-1 focus:ring-[var(--lub-gold)] shadow-sm min-w-[130px] transition-colors cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="bottle">Bottles</option>
          <option value="bucket">Buckets</option>
        </select>

        {/* RESET BUTTON */}
        {(currentSearch || currentType !== "all") && (
          <button
            onClick={handleReset}
            title="Clear Filters"
            className="h-[38px] px-2.5 flex items-center justify-center text-gray-400 bg-white border border-gray-200 rounded-md hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
