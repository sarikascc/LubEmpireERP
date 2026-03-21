import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import AddFinishedProductModal from "@/components/finished-products/AddFinishedProductModal";
import FinishedProductRowActions from "@/components/finished-products/FinishedProductRowActions";
import ProductionEntryModal from "@/components/finished-products/ProductionEntryModal";
import FinishedProductFilters from "@/components/finished-products/FinishedProductFilters";

export default async function FinishedProductsPage({
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
  const tab = resolvedParams.tab || "products";
  const pageSize = 20;

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();

  let productsData = [];
  let productionLogsData = [];
  let count = 0;

  if (tab === "products") {
    let query = supabase
      .from("finished_products")
      .select("*", { count: "exact" })
      .order("product_name", { ascending: true });

    if (search) {
      query = query.or(
        `product_name.ilike.%${search}%,grade_name.ilike.%${search}%`,
      );
    }

    const { data, count: c } = await query.range(from, to);
    productsData = data || [];
    count = c || 0;
  } else if (tab === "production-history") {
    let query = supabase
      .from("production_logs")
      .select("*, finished_products!inner(product_name, grade_name, unit)", {
        count: "exact",
      })
      .order("created_at", { ascending: false });

    const { data, count: c } = await query.range(from, to);
    productionLogsData = data || [];
    count = c || 0;
  }

  const totalPages = Math.ceil(count / pageSize);

  // Fetch data needed for the Production Entry Modal
  const { data: allFinishedProducts } = await supabase
    .from("finished_products")
    .select("id, product_name, grade_name, unit")
    .order("product_name");
  const { data: allRawMaterials } = await supabase
    .from("materials")
    .select("id, name, unit, stock")
    .eq("type", "Raw Material")
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
      {/* --- TOP TAB NAVIGATION --- */}
      <div className="shrink-0">
        <div className="flex items-center gap-1 p-1.5 bg-white/40 backdrop-blur-md border border-white/60 shadow-sm rounded-full w-max">
          <Link
            href="?tab=products"
            className={`px-6 py-2.5 text-sm font-extrabold rounded-full transition-all duration-300 ${
              tab === "products"
                ? "bg-white text-[var(--lub-gold)] shadow-md border border-white/80"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
            }`}
          >
            Finished Products
          </Link>
          <Link
            href="?tab=production-history"
            className={`px-6 py-2.5 text-sm font-extrabold rounded-full transition-all duration-300 ${
              tab === "production-history"
                ? "bg-white text-[var(--lub-gold)] shadow-md border border-white/80"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
            }`}
          >
            Production History
          </Link>
        </div>
      </div>

      <div className="flex flex-col flex-1 shadow-sm border border-gray-100 rounded-xl overflow-hidden bg-white min-h-0">
        {/* ========================================= */}
        {/* ============ PRODUCTS TAB =============== */}
        {/* ========================================= */}
        {tab === "products" && (
          <>
            <div className="p-4 border-b border-gray-100 flex flex-col xl:flex-row justify-between items-center gap-4 bg-white shrink-0">
              <FinishedProductFilters />
              <div className="flex items-center gap-2 shrink-0">
                <AddFinishedProductModal />
              </div>
            </div>

            <div className="overflow-auto flex-1 bg-white">
              <table className="erp-table w-full table-fixed min-w-[800px]">
                <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
                  <tr>
                    <th className="w-[40%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Product Name
                    </th>
                    <th className="w-[20%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Grade
                    </th>
                    <th className="w-[25%] text-center p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Bulk Stock
                    </th>
                    <th className="w-[15%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {productsData.length > 0 ? (
                    productsData.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="p-4 font-semibold text-[var(--lub-dark)] break-words">
                          {product.product_name}
                        </td>
                        <td className="p-4 font-bold text-gray-600">
                          {product.grade_name}
                        </td>
                        <td
                          className={`p-4 text-center font-bold ${product.stock <= 0 ? "text-red-500" : "text-green-600"}`}
                        >
                          {Number(product.stock).toFixed(2)}{" "}
                          <span className="text-xs font-normal text-gray-400">
                            {product.unit}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <FinishedProductRowActions product={product} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-20 text-gray-400"
                      >
                        No products found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ========================================= */}
        {/* ======== PRODUCTION HISTORY TAB ========= */}
        {/* ========================================= */}
        {tab === "production-history" && (
          <>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="font-bold text-gray-700">Production Logs</h3>
              <div className="flex items-center gap-2 shrink-0">
                <ProductionEntryModal
                  finishedProducts={allFinishedProducts || []}
                  rawMaterials={allRawMaterials || []}
                />
              </div>
            </div>

            <div className="overflow-auto flex-1 bg-white">
              <table className="erp-table w-full table-fixed min-w-[800px]">
                <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
                  <tr>
                    <th className="w-[40%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Product Manufactured
                    </th>
                    <th className="w-[20%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Grade
                    </th>
                    <th className="w-[20%] text-center p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Quantity Produced
                    </th>
                    <th className="w-[20%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {productionLogsData.length ? (
                    productionLogsData.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="p-4 font-semibold text-[var(--lub-dark)]">
                          {log.finished_products?.product_name}
                        </td>
                        <td className="p-4 font-bold text-gray-600">
                          {log.finished_products?.grade_name}
                        </td>
                        <td className="p-4 text-center font-bold text-blue-600">
                          +{Number(log.quantity_produced).toFixed(2)}{" "}
                          <span className="text-xs font-normal text-gray-400">
                            {log.finished_products?.unit}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-600 text-right">
                          {new Date(log.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-20 text-gray-400"
                      >
                        No production logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* --- PAGINATION FOOTER --- */}
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
