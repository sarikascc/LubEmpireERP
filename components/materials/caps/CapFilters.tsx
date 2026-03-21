"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";

export default function CapFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("search")?.toString() || "";
  const [searchTerm, setSearchTerm] = useState(currentSearch);

  useEffect(() => {
    setSearchTerm(currentSearch);
  }, [currentSearch]);

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

  const handleReset = () => {
    setSearchTerm("");
    startTransition(() => {
      router.replace(pathname);
    });
  };

  return (
    <div className="flex flex-1 items-center gap-2 w-full max-w-2xl">
      <div className="relative flex-1 w-full min-w-[200px]">
        <svg
          className="w-[18px] h-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search caps..."
          className="w-full h-[38px] pl-9 pr-8 text-sm text-gray-700 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-[var(--lub-gold)] focus:ring-1 focus:ring-[var(--lub-gold)] shadow-sm transition-colors"
        />

        {isPending && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-[var(--lub-gold)] rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {currentSearch && (
        <button
          onClick={handleReset}
          className="h-[38px] px-4 flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm shrink-0"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset Search
        </button>
      )}
    </div>
  );
}