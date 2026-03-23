import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AccountingEntriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    typeFilter?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const currentPage = Number(resolvedParams.page) || 1;
  const search = resolvedParams.search || "";
  const currentType = resolvedParams.typeFilter || "all";
  const pageSize = 20;

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();

  let query = supabase
    .from("accounting_entries")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) query = query.ilike("description", `%${search}%`);
  if (currentType !== "all") query = query.eq("entry_type", currentType);

  const { data: entriesData, count } = await query.range(from, to);
  const totalPages = Math.ceil((count || 0) / pageSize);

  const buildPaginationUrl = (newPage: number) => {
    const params = new URLSearchParams();
    params.set("page", newPage.toString());
    if (search) params.set("search", search);
    if (currentType !== "all") params.set("typeFilter", currentType);
    return `?${params.toString()}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] gap-4">
      <div className="flex flex-col flex-1 shadow-sm border border-gray-100 rounded-xl overflow-hidden bg-white min-h-0">
        {/* --- FILTERS --- */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white shrink-0">
          <div className="flex gap-2 bg-gray-50/80 p-1.5 rounded-lg border border-gray-100">
            <Link
              href="?typeFilter=all"
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm ${currentType === "all" ? "bg-white text-[var(--lub-dark)] border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
            >
              All Entries
            </Link>
            <Link
              href="?typeFilter=Income"
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm ${currentType === "Income" ? "bg-green-500 text-white border border-green-600" : "text-gray-500 hover:text-green-600"}`}
            >
              Income
            </Link>
            <Link
              href="?typeFilter=Expense"
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm ${currentType === "Expense" ? "bg-red-500 text-white border border-red-600" : "text-gray-500 hover:text-red-600"}`}
            >
              Expense
            </Link>
          </div>
        </div>

        {/* --- MAIN TABLE --- */}
        <div className="overflow-auto flex-1 bg-white">
          <table className="erp-table w-full table-fixed min-w-[900px]">
            <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <tr>
                <th className="w-[12%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Date
                </th>
                <th className="w-[10%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Type
                </th>
                <th className="w-[38%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Description
                </th>
                {/* NEW COLUMNS */}
                <th className="w-[10%] text-center p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Qty
                </th>
                <th className="w-[12%] text-center p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Rate (₹)
                </th>
                <th className="w-[18%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Total Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {entriesData && entriesData.length > 0 ? (
                entriesData.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="p-4 text-sm text-gray-600 font-medium">
                      {new Date(entry.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${entry.entry_type === "Income" ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-500 border border-red-100"}`}
                      >
                        {entry.entry_type}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="text-sm font-bold text-gray-800 break-words">
                        {entry.description}
                      </div>
                    </td>

                    {/* DYNAMIC QTY COLUMN */}
                    <td className="p-4 text-center">
                      {entry.quantity ? (
                        <div className="text-sm font-bold text-gray-700">
                          {entry.quantity}{" "}
                          <span className="text-[10px] text-gray-400 font-normal uppercase">
                            {entry.unit || "PCS"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    
                    <td className="p-4 text-center">
                      {entry.rate ? (
                        <div className="text-sm font-medium text-gray-600">
                          ₹{Number(entry.rate).toLocaleString("en-IN")}
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <div
                        className={`text-lg font-black tracking-tight ${entry.entry_type === "Income" ? "text-green-600" : "text-gray-800"}`}
                      >
                        {entry.entry_type === "Income" ? "+" : "-"} ₹
                        {Number(entry.amount).toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-24">
                    <p className="text-gray-400 font-medium">
                      No accounting entries found.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        
        {count !== null && count > 0 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
            <div className="text-sm text-gray-500">
              Showing <span className="font-semibold">{from + 1}</span> to{" "}
              <span className="font-semibold">{Math.min(to + 1, count)}</span>{" "}
              of <span className="font-semibold">{count}</span>
            </div>
            <div className="flex gap-2">
              <Link
                href={buildPaginationUrl(currentPage - 1)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg border ${currentPage <= 1 ? "pointer-events-none opacity-50 bg-gray-50" : "bg-white hover:bg-gray-50"}`}
              >
                Previous
              </Link>
              <Link
                href={buildPaginationUrl(currentPage + 1)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg border ${currentPage >= totalPages ? "pointer-events-none opacity-50 bg-gray-50" : "bg-white hover:bg-gray-50"}`}
              >
                Next
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
