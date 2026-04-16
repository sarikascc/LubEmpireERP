import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import AddMaterialModal from "@/components/materials/AddMaterialModal";
import RowActions from "@/components/materials/RowActions";
import StockInModal from "@/components/materials/StockInModal";
import MaterialFilters from "@/components/materials/MaterialFilter";
import EditStockInModal from "@/components/materials/EditStockInModal";

export default async function RawMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    unit?: string;
    tab?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const currentPage = Number(resolvedParams.page) || 1;
  const search = resolvedParams.search || "";
  const unit = resolvedParams.unit || "";
  const tab = resolvedParams.tab || "materials";
  const pageSize = 20;

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();

  let materialsData: any[] = [];
  let transactionsData: any[] = [];
  let count = 0;

  if (tab === "materials") {
    let query = supabase
      .from("materials")
      .select("*", { count: "exact" })
      .eq("type", "Raw Material")
      .order("name", { ascending: true });

    if (search) query = query.ilike("name", `%${search}%`);
    if (unit) query = query.eq("unit", unit);

    const { data, count: c } = await query.range(from, to);
    materialsData = data || [];
    count = c || 0;
  } else if (tab === "stock-in") {
    let query = supabase
      .from("material_transactions")
      .select("*, materials!inner(name, unit)", { count: "exact" })
      .eq("materials.type", "Raw Material")
      .eq("transaction_type", "Purchase")
      .order("created_at", { ascending: false });

    const { data, count: c } = await query.range(from, to);
    transactionsData = data || [];
    count = c || 0;
  }

  const totalPages = Math.ceil(count / pageSize);

  const { data: allMaterials } = await supabase
    .from("materials")
    .select("id, name, unit")
    .eq("type", "Raw Material")
    .order("name");

  const buildPaginationUrl = (newPage: number) => {
    const params = new URLSearchParams();
    params.set("page", newPage.toString());
    params.set("tab", tab);
    if (search) params.set("search", search);
    if (unit) params.set("unit", unit);
    return `?${params.toString()}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] gap-4">
      <div className="shrink-0">
        <div className="flex items-center gap-1 p-1.5 bg-white/40 backdrop-blur-md border border-white/60 shadow-sm rounded-full w-max">
          <Link
            href="?tab=materials"
            className={`px-6 py-2.5 text-sm font-extrabold rounded-full transition-all duration-300 ${
              tab === "materials"
                ? "bg-white text-[var(--lub-gold)] shadow-md border border-white/80"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
            }`}
          >
            Raw Materials
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
        {tab === "materials" && (
          <>
            <div className="p-4 border-b border-gray-100 flex flex-col xl:flex-row justify-between items-center gap-4 bg-white shrink-0">
              <MaterialFilters />
              <div className="flex items-center gap-2 shrink-0">
                <AddMaterialModal />
              </div>
            </div>

            <div className="overflow-auto flex-1 bg-white">
              <table className="erp-table w-full table-fixed min-w-[800px]">
                <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
                  <tr>
                    <th className="w-[55%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Material Name
                    </th>
                    <th className="w-[30%] text-center p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Current Stock
                    </th>
                    <th className="w-[15%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {materialsData.length ? (
                    materialsData.map((material) => (
                      <tr
                        key={material.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="p-4 font-semibold text-gray-800 break-words">
                          {material.name}
                        </td>
                        <td
                          className={`p-4 text-center font-bold ${material.stock <= 0 ? "text-red-500" : "text-green-600"}`}
                        >
                          {/* 🔥 Removed Math.round(), now formatting to 2 decimal places max */}
                          {Number(material.stock).toLocaleString("en-IN", {
                            maximumFractionDigits: 2,
                          })}{" "}
                          <span className="text-xs font-normal text-gray-500">
                            {material.unit}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <RowActions material={material} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center py-20 text-gray-400"
                      >
                        No materials found.
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
                <StockInModal materials={allMaterials || []} />
              </div>
            </div>

            <div className="overflow-auto flex-1 bg-white">
              <table className="erp-table w-full table-fixed min-w-[1000px]">
                <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
                  <tr>
                    <th className="w-[20%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Material Name
                    </th>
                    <th className="w-[10%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Qty Added
                    </th>
                    <th className="w-[10%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Rate (₹)
                    </th>
                    <th className="w-[15%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Total (₹)
                    </th>
                    <th className="w-[20%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b pl-8">
                      Supplier Details
                    </th>
                    <th className="w-[15%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Date
                    </th>
                    <th className="w-[10%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsData.length ? (
                    transactionsData.map((txn) => {
                      const totalAmount =
                        Number(txn.quantity) * Number(txn.rate);

                      return (
                        <tr
                          key={txn.id}
                          className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="p-4 text-left font-semibold text-[var(--lub-dark)]">
                            {txn.materials?.name}
                          </td>
                          <td className="p-4 text-right font-bold text-green-600">
                            {/* 🔥 Removed Math.round() here too */}+
                            {Number(txn.quantity).toLocaleString("en-IN", {
                              maximumFractionDigits: 2,
                            })}{" "}
                            <span className="text-xs font-normal text-gray-400">
                              {txn.materials?.unit}
                            </span>
                          </td>
                          <td className="p-4 text-right font-medium text-gray-700">
                            ₹{Number(txn.rate).toFixed(2)}
                          </td>
                          <td className="p-4 text-right font-black text-gray-800">
                            ₹
                            {totalAmount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="p-4 text-left text-xs text-gray-500 truncate pl-8">
                            {txn.reason}
                          </td>
                          <td className="p-4 text-sm text-gray-600 text-right">
                            {new Date(txn.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right">
                            <EditStockInModal transaction={txn} />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
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
                className={`px-4 py-2 text-sm font-semibold rounded-lg border ${
                  currentPage <= 1
                    ? "pointer-events-none opacity-50 bg-gray-50"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                Previous
              </Link>
              <Link
                href={buildPaginationUrl(currentPage + 1)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg border ${
                  currentPage >= totalPages
                    ? "pointer-events-none opacity-50 bg-gray-50"
                    : "bg-white hover:bg-gray-50"
                }`}
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
