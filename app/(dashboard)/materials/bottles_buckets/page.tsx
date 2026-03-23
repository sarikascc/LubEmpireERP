import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import AddContainerModal from "@/components/materials/containers/AddContainerModal";
import ContainerRowActions from "@/components/materials/containers/ContainerRowActions";
import ContainerStockInModal from "@/components/materials/containers/ContainerStockInModal";
import ContainerFilters from "@/components/materials/containers/ContainerFilters";

export default async function ContainersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    typeFilter?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const currentPage = Number(resolvedParams.page) || 1;
  const search = resolvedParams.search || "";
  const tab = resolvedParams.tab || "containers";
  const typeFilter = resolvedParams.typeFilter || "all"; // <-- 2. EXTRACT TYPE FILTER
  const pageSize = 20;

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();

  let containersData: any[] = [];
  let transactionsData: any[] = [];
  let count = 0;

  if (tab === "containers") {
    let query = supabase
      .from("containers")
      .select("*", { count: "exact" })
      .order("name", { ascending: true });

    if (search) query = query.ilike("name", `%${search}%`);

    if (typeFilter !== "all") query = query.eq("type", typeFilter);

    const { data, count: c } = await query.range(from, to);
    containersData = data || [];
    count = c || 0;
  } else if (tab === "stock-in") {
    let query = supabase
      .from("container_transactions")
      .select("*, containers!inner(name)", { count: "exact" })
      .eq("transaction_type", "Purchase")
      .order("created_at", { ascending: false });

    const { data, count: c } = await query.range(from, to);
    transactionsData = data || [];
    count = c || 0;
  }

  const totalPages = Math.ceil(count / pageSize);

  const { data: materialsData, error: materialsError } = await supabase
    .from("materials")
    .select("id, name, type")
    .in("type", ["Box", "Sticker", "Cap"]);

  if (materialsError)
    console.error("Error fetching materials:", materialsError);

  const safeMaterials = materialsData || [];

  const boxes = safeMaterials.filter((m) => m.type === "Box");
  const stickers = safeMaterials.filter((m) => m.type === "Sticker");
  const caps = safeMaterials.filter((m) => m.type === "Cap");

  const { data: allContainers } = await supabase
    .from("containers")
    .select("id, name")
    .order("name");

  const safeAllContainers = allContainers || [];

  const getMaterialName = (id: string | null) => {
    if (!id) return null;
    return safeMaterials.find((m) => m.id === id)?.name || "Unknown";
  };

  const buildPaginationUrl = (newPage: number) => {
    const params = new URLSearchParams();
    params.set("page", newPage.toString());
    params.set("tab", tab);
    if (search) params.set("search", search);
    if (typeFilter !== "all") params.set("typeFilter", typeFilter); // <-- 4. KEEP FILTER ON PAGINATION
    return `?${params.toString()}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] gap-4">
      <div className="shrink-0">
        <div className="flex items-center gap-1 p-1.5 bg-white/40 backdrop-blur-md border border-white/60 shadow-sm rounded-full w-max">
          <Link
            href="?tab=containers"
            className={`px-6 py-2.5 text-sm font-extrabold rounded-full transition-all duration-300 ${
              tab === "containers"
                ? "bg-white text-[var(--lub-gold)] shadow-md border border-white/80"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
            }`}
          >
            Bottles & Buckets
          </Link>
          <Link
            href="?tab=stock-in"
            className={`px-6 py-2.5 text-sm font-extrabold rounded-full transition-all duration-300 ${
              tab === "stock-in"
                ? "bg-white text-[var(--lub-gold)] shadow-md border border-white/80"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
            }`}
          >
            Purchase History
          </Link>
        </div>
      </div>

      <div className="flex flex-col flex-1 shadow-sm border border-gray-100 rounded-xl overflow-hidden bg-white min-h-0">
        {tab === "containers" && (
          <>
            <div className="p-4 border-b border-gray-100 flex flex-col xl:flex-row justify-between items-center gap-4 bg-white shrink-0">
              <ContainerFilters />
              <div className="flex items-center gap-2 shrink-0">
                <AddContainerModal
                  boxes={boxes}
                  stickers={stickers}
                  caps={caps}
                />
              </div>
            </div>

            <div className="overflow-auto flex-1 bg-white">
              <table className="erp-table w-full table-fixed min-w-[1100px]">
                <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
                  <tr>
                    <th className="w-[20%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Name
                    </th>
                    <th className="w-[10%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Type
                    </th>
                    <th className="w-[10%] text-center p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Stock
                    </th>
                    <th className="w-[10%] text-center p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Capacity
                    </th>
                    <th className="w-[15%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Master Box
                    </th>
                    <th className="w-[15%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Cap
                    </th>
                    <th className="w-[10%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Sticker
                    </th>
                    <th className="w-[10%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {containersData.length > 0 ? (
                    containersData.map((container) => (
                      <tr
                        key={container.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="p-4 text-left font-semibold text-gray-800 align-middle">
                          {container.name}
                        </td>

                        <td className="p-4 text-left align-middle">
                          <span
                            className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md border ${
                              container.type?.toLowerCase() === "bucket"
                                ? "bg-orange-50 text-orange-600 border-orange-100"
                                : "bg-blue-50 text-blue-600 border-blue-100"
                            }`}
                          >
                            {container.type || "Bottle"}
                          </span>
                        </td>

                        <td
                          className={`p-4 text-center align-middle font-bold ${
                            container.stock <= 0
                              ? "text-red-500"
                              : "text-green-600"
                          }`}
                        >
                          {Number(container.stock).toFixed(0)}
                        </td>

                        <td className="p-4 text-center align-middle">
                          <div className="font-bold text-gray-700">
                            {Number(container.capacity_per_piece)}{" "}
                            {container.capacity_unit}
                          </div>
                        </td>

                        <td className="p-4 text-left align-middle">
                          {container.box_id ? (
                            <>
                              <div className="text-sm font-semibold text-gray-700 truncate">
                                {getMaterialName(container.box_id)}
                              </div>
                              <div className="text-xs text-purple-600 font-bold mt-0.5 bg-purple-50 inline-block px-1.5 py-0.5 rounded">
                                Pack of {container.pieces_per_box}
                              </div>
                            </>
                          ) : (
                            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                              Not Required
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-left align-middle">
                          {container.cap_id ? (
                            <>
                              <div className="text-sm font-semibold text-gray-700 truncate">
                                {getMaterialName(container.cap_id)}
                              </div>
                              <div className="text-xs text-gray-500 font-medium mt-0.5">
                                Qty:{" "}
                                <span className="text-emerald-600 font-bold">
                                  {container.cap_quantity}
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                              Not Required
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-left align-middle">
                          <div className="text-sm font-semibold text-gray-700 truncate">
                            {getMaterialName(container.sticker_id) ||
                              "Missing Sticker!"}
                          </div>
                          <div className="text-xs text-gray-500 font-medium mt-0.5">
                            Qty:{" "}
                            <span className="text-blue-600 font-bold">
                              {container.sticker_quantity}
                            </span>
                          </div>
                        </td>

                        <td className="p-4 text-right align-middle">
                          <ContainerRowActions
                            container={container}
                            boxes={boxes}
                            stickers={stickers}
                            caps={caps}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-20 text-gray-400"
                      >
                        No Bottles/Buckets found.
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
              <h3 className="font-bold text-gray-700">
                Bottles/Buckets Purchase History
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <ContainerStockInModal containers={safeAllContainers} />
              </div>
            </div>

            <div className="overflow-auto flex-1 bg-white">
              <table className="erp-table w-full table-fixed min-w-[800px]">
                <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
                  <tr>
                    <th className="w-[30%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Bottles/Buckets Name
                    </th>
                    <th className="w-[15%] text-center p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Qty Added
                    </th>
                    <th className="w-[15%] text-center p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Rate (₹)
                    </th>
                    <th className="w-[25%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Supplier Details
                    </th>
                    <th className="w-[15%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsData.length ? (
                    transactionsData.map((txn) => (
                      <tr
                        key={txn.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="p-4 font-semibold text-[var(--lub-dark)]">
                          {txn.containers?.name}
                        </td>
                        <td className="p-4 text-center font-bold text-green-600">
                          +{Number(txn.quantity).toFixed(0)}{" "}
                          <span className="text-xs font-normal text-gray-400">
                            PCS
                          </span>
                        </td>
                        <td className="p-4 text-center font-medium text-gray-700">
                          ₹{Number(txn.rate).toFixed(2)}
                        </td>
                        <td className="p-4 text-xs text-gray-500 truncate">
                          {txn.reason}
                        </td>
                        <td className="p-4 text-sm text-gray-600 text-right">
                          {new Date(txn.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
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
