"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";

export default function FinishedProductFilters() {
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

  return (
    <div className="flex flex-1 items-center gap-2 w-full max-w-2xl">
      <div className="relative flex-1 w-full min-w-[200px]">
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
          placeholder="Search products or grades..."
          className="w-full h-[38px] pl-9 pr-8 text-sm text-gray-700 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-[var(--lub-gold)] focus:ring-1 focus:ring-[var(--lub-gold)] shadow-sm transition-colors"
        />
      </div>
    </div>
  );
}
