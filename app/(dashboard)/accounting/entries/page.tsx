import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import TransactionFilters from "@/components/accounting/TransactionFilters"; // NORMAL IMPORT

export default async function AccountingEntriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    typeFilter?: string;
    startDate?: string;
    endDate?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const currentPage = Number(resolvedParams.page) || 1;
  const search = resolvedParams.search || "";
  const currentType = resolvedParams.typeFilter || "all";
  const startDate = resolvedParams.startDate || "";
  const endDate = resolvedParams.endDate || "";
  const pageSize = 20;

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();

  // Query A: For the HTML Table (Paginated - 20 per page)
  let tableQuery = supabase
    .from("accounting_entries")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  // Query B: For the Excel Export (Gets ALL filtered rows)
  let exportQuery = supabase
    .from("accounting_entries")
    .select("*")
    .order("created_at", { ascending: false });

  // Apply filters to BOTH queries
  if (search) {
    tableQuery = tableQuery.ilike("description", `%${search}%`);
    exportQuery = exportQuery.ilike("description", `%${search}%`);
  }
  if (currentType !== "all") {
    tableQuery = tableQuery.eq("entry_type", currentType);
    exportQuery = exportQuery.eq("entry_type", currentType);
  }
  if (startDate) {
    tableQuery = tableQuery.gte("created_at", `${startDate}T00:00:00.000Z`);
    exportQuery = exportQuery.gte("created_at", `${startDate}T00:00:00.000Z`);
  }
  if (endDate) {
    tableQuery = tableQuery.lte("created_at", `${endDate}T23:59:59.999Z`);
    exportQuery = exportQuery.lte("created_at", `${endDate}T23:59:59.999Z`);
  }

  // Fetch data
  const { data: entriesData, count } = await tableQuery.range(from, to);
  const { data: fullExportData } = await exportQuery;

  const totalPages = Math.ceil((count || 0) / pageSize);

  const buildPaginationUrl = (newPage: number) => {
    const params = new URLSearchParams();
    params.set("page", newPage.toString());
    if (search) params.set("search", search);
    if (currentType !== "all") params.set("typeFilter", currentType);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return `?${params.toString()}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] gap-4">
      <div className="flex flex-col flex-1 shadow-sm border border-gray-100 rounded-xl overflow-hidden bg-white min-h-0">
        <div className="p-4 border-b border-gray-100 flex flex-col items-start gap-4 bg-white shrink-0">
          <div className="flex gap-2 bg-gray-50/80 p-1.5 rounded-lg border border-gray-100 w-max">
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

          <TransactionFilters dataToExport={fullExportData || []} />
        </div>

        <div className="overflow-auto flex-1 bg-white">
          <table className="erp-table w-full table-fixed min-w-[1000px]">
            <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <tr>
                <th className="w-[10%] text-left p-3 text-xs font-bold text-gray-500 uppercase border-b">
                  Date
                </th>
                <th className="w-[8%] text-left p-3 text-xs font-bold text-gray-500 uppercase border-b">
                  Type
                </th>
                <th className="w-[15%] text-left p-3 text-xs font-bold text-gray-500 uppercase border-b">
                  Party
                </th>
                <th className="w-[27%] text-left p-3 text-xs font-bold text-gray-500 uppercase border-b">
                  Description
                </th>
                <th className="w-[8%] text-center p-3 text-xs font-bold text-gray-500 uppercase border-b">
                  Qty
                </th>
                <th className="w-[10%] text-center p-3 text-xs font-bold text-gray-500 uppercase border-b">
                  Rate (₹)
                </th>
                <th className="w-[12%] text-right p-3 text-xs font-bold text-gray-500 uppercase border-b">
                  Amount
                </th>
                <th className="w-[10%] text-right p-3 text-xs font-bold text-gray-500 uppercase border-b">
                  Profit/Loss
                </th>
              </tr>
            </thead>
            <tbody>
              {entriesData && entriesData.length > 0 ? (
                entriesData.map((entry) => {
                  const displayType =
                    entry.entry_type === "Income" ? "SALES" : "PURCHASE";
                  let partyName = "-";
                  let cleanDesc = entry.description;

                  const match = entry.description.match(
                    /^(.*?)\s*-\s*(.*?)\s*(\(.*)$/,
                  );
                  if (match) {
                    partyName = match[2].trim();
                    cleanDesc = match[3].trim().replace(/^\(|\)$/g, "");
                  }

                  const isLoss = Number(entry.profit) < 0;

                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="p-3 text-sm text-gray-600 font-medium">
                        {new Date(entry.created_at).toLocaleDateString(
                          "en-GB",
                          { day: "2-digit", month: "2-digit", year: "numeric" },
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${entry.entry_type === "Income" ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-500 border border-red-100"}`}
                        >
                          {displayType}
                        </span>
                      </td>
                      <td className="p-3">
                        <div
                          className="text-sm font-bold text-[var(--lub-dark)] truncate"
                          title={partyName}
                        >
                          {partyName}
                        </div>
                      </td>
                      <td className="p-3">
                        <div
                          className="text-sm font-semibold text-gray-500 truncate"
                          title={cleanDesc}
                        >
                          {cleanDesc}
                        </div>
                      </td>
                      <td className="p-3 text-center">
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
                      <td className="p-3 text-center">
                        {entry.rate ? (
                          <div className="text-sm font-medium text-gray-600">
                            ₹{Number(entry.rate).toLocaleString("en-IN")}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div
                          className={`text-[15px] font-black tracking-tight ${entry.entry_type === "Income" ? "text-green-600" : "text-gray-800"}`}
                        >
                          {entry.entry_type === "Income" ? "+ ₹" : "- ₹"}
                          {Math.abs(Number(entry.amount)).toLocaleString(
                            "en-IN",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        {entry.entry_type === "Income" &&
                        entry.profit != null ? (
                          <div
                            className={`text-[15px] font-black tracking-tight ${
                              isLoss ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {isLoss ? "- ₹" : "₹"}
                            {Math.abs(Number(entry.profit)).toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-24">
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
