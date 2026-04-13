import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import AddCapModal from "@/components/materials/caps/AddCapModal";
import CapRowActions from "@/components/materials/caps/CapRowActions";
import CapStockInModal from "@/components/materials/caps/CapStockInModal";
import CapFilters from "@/components/materials/caps/CapFilters";

export default async function CapsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const currentPage = Number(resolvedParams.page) || 1;
  const search = resolvedParams.search || "";
  const tab = resolvedParams.tab || "caps";
  const pageSize = 20;

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();

  let capsData: any[] = [];
  let transactionsData: any[] = [];
  let count = 0;

  if (tab === "caps") {
    let query = supabase
      .from("materials")
      .select("*", { count: "exact" })
      .eq("type", "Cap")
      .order("name", { ascending: true });

    if (search) query = query.ilike("name", `%${search}%`);

    const { data, count: c } = await query.range(from, to);
    capsData = data || [];
    count = c || 0;
  } else if (tab === "stock-in") {
    let query = supabase
      .from("material_transactions")
      .select("*, materials!inner(name)", { count: "exact" })
      .eq("materials.type", "Cap")
      .eq("transaction_type", "Purchase")
      .order("created_at", { ascending: false });

    const { data, count: c } = await query.range(from, to);
    transactionsData = data || [];
    count = c || 0;
  }

  const totalPages = Math.ceil(count / pageSize);

  const { data: allCaps } = await supabase
    .from("materials")
    .select("id, name")
    .eq("type", "Cap")
    .order("name");

  const buildPaginationUrl = (newPage: number) => {
    const params = new URLSearchParams();
    params.set("page", newPage.toString());
    params.set("tab", tab);
    if (search) params.set("search", search);
    return `?${params.toString()}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] gap-4">
      <div className="shrink-0">
        <div className="flex items-center gap-1 p-1.5 bg-white/40 backdrop-blur-md border border-white/60 shadow-sm rounded-full w-max">
          <Link
            href="?tab=caps"
            className={`px-6 py-2.5 text-sm font-extrabold rounded-full transition-all duration-300 ${
              tab === "caps"
                ? "bg-white text-[var(--lub-gold)] shadow-md border border-white/80"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
            }`}
          >
            Caps
          </Link>
          <Link
            href="?tab=stock-in"
            className={`px-6 py-2.5 text-sm font-extrabold rounded-full transition-all duration-300 ${
              tab === "stock-in"
                ? "bg-white text-[var(--lub-gold)] shadow-md border border-white/80"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
            }`}
          >
            Stock-In History
          </Link>
        </div>
      </div>

      <div className="flex flex-col flex-1 shadow-sm border border-gray-100 rounded-xl overflow-hidden bg-white min-h-0">
        {tab === "caps" && (
          <>
            <div className="p-4 border-b border-gray-100 flex flex-col xl:flex-row justify-between items-center gap-4 bg-white shrink-0">
              <CapFilters />
              <div className="flex items-center gap-2 shrink-0">
                <AddCapModal />
              </div>
            </div>

            <div className="overflow-auto flex-1 bg-white">
              <table className="erp-table w-full table-fixed min-w-[800px]">
                <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
                  <tr>
                    <th className="w-[60%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Cap Size
                    </th>
                    <th className="w-[25%] text-center p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Stock (PCS)
                    </th>
                    <th className="w-[15%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {capsData.length > 0 ? (
                    capsData.map((cap) => (
                      <tr
                        key={cap.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="p-4 font-semibold text-gray-800 break-words">
                          {cap.name}
                        </td>
                        <td
                          className={`p-4 text-center font-bold ${cap.stock <= 0 ? "text-red-500" : "text-green-600"}`}
                        >
                          {Number(cap.stock).toFixed(0)}
                        </td>
                        <td className="p-4 text-right">
                          <CapRowActions cap={cap} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center py-20 text-gray-400"
                      >
                        No caps found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "stock-in" && (
          <>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="font-bold text-gray-700">Purchase History</h3>
              <div className="flex items-center gap-2 shrink-0">
                <CapStockInModal caps={allCaps || []} />
              </div>
            </div>

            <div className="overflow-auto flex-1 bg-white">
              <table className="erp-table w-full table-fixed min-w-[900px]">
                <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
                  <tr>
                    <th className="w-[25%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Cap Size
                    </th>
                    {/* 🔥 QTY AND RATE MOVED TO RIGHT ALIGNMENT */}
                    <th className="w-[15%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Qty Added
                    </th>
                    <th className="w-[15%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Rate (₹)
                    </th>
                    {/* 🔥 NEW TOTAL AMOUNT COLUMN */}
                    <th className="w-[15%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Total (₹)
                    </th>
                    <th className="w-[20%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b pl-8">
                      Supplier Details
                    </th>
                    <th className="w-[10%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsData.length ? (
                    transactionsData.map((txn) => {
                      // 🔥 Do the math right here!
                      const totalAmount =
                        Number(txn.quantity) * Number(txn.rate);

                      return (
                        <tr
                          key={txn.id}
                          className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="p-4 font-semibold text-[var(--lub-dark)]">
                            {txn.materials?.name}
                          </td>
                          {/* 🔥 RIGHT ALIGNED */}
                          <td className="p-4 text-right font-bold text-green-600">
                            +{Number(txn.quantity).toFixed(0)}{" "}
                            <span className="text-xs font-normal text-gray-400">
                              PCS
                            </span>
                          </td>
                          {/* 🔥 RIGHT ALIGNED */}
                          <td className="p-4 text-right font-medium text-gray-700">
                            ₹{Number(txn.rate).toFixed(2)}
                          </td>
                          {/* 🔥 NEW TOTAL AMOUNT CELL */}
                          <td className="p-4 text-right font-black text-gray-800">
                            ₹
                            {totalAmount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="p-4 text-xs text-gray-500 truncate pl-8">
                            {txn.reason}
                          </td>
                          <td className="p-4 text-sm text-gray-600 text-right">
                            {new Date(txn.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={6} // 🔥 Updated to 6 columns
                        className="text-center py-20 text-gray-400"
                      >
                        No purchase history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {count > 0 && (
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
