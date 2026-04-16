import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import AddOrderModal from "@/components/accounting/orders/AddOrderModal";
import OrderFilters from "@/components/accounting/orders/OrderFilter";
import OrderRowActions from "@/components/accounting/orders/OrderRowActions";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const currentPage = Number(resolvedParams.page) || 1;
  const search = resolvedParams.search || "";
  const startDate = resolvedParams.startDate || "";
  const endDate = resolvedParams.endDate || "";
  const pageSize = 20;

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      `
      *,
      finished_products (product_name, grade_name, unit),
      containers (name, pieces_per_box),
      materials (name)
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (search) {
    const { data: matchedProducts } = await supabase
      .from("finished_products")
      .select("id")
      .ilike("product_name", `%${search}%`);

    const matchedProductIds = matchedProducts?.map((p) => p.id) || [];

    if (matchedProductIds.length > 0) {
      query = query.or(
        `customer_name.ilike.%${search}%,finished_product_id.in.(${matchedProductIds.join(",")})`,
      );
    } else {
      query = query.ilike("customer_name", `%${search}%`);
    }
  }

  if (startDate) query = query.gte("created_at", `${startDate}T00:00:00.000Z`);
  if (endDate) query = query.lte("created_at", `${endDate}T23:59:59.999Z`);

  const { data: ordersData, count } = await query.range(from, to);
  const totalPages = Math.ceil((count || 0) / pageSize);

  const { data: finishedProducts } = await supabase
    .from("finished_products")
    .select("id, product_name, grade_name, stock, unit, cost_per_unit")
    .order("product_name");

  const { data: containersList } = await supabase
    .from("containers")
    .select(
      "id, name, pieces_per_box, capacity_per_piece, capacity_unit, cost_per_piece, box_id, cap_id, cap_quantity",
    )
    .order("name");

  // 🔥 FETCH FULL MATERIALS TO EXTRACT STICKERS
  const { data: materialsData } = await supabase
    .from("materials")
    .select("id, name, cost_per_unit, stock, type");

  const materials = materialsData || [];
  const stickers = materials.filter((m) => m.type === "Sticker");

  const buildPaginationUrl = (newPage: number) => {
    const params = new URLSearchParams();
    params.set("page", newPage.toString());
    if (search) params.set("search", search);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return `?${params.toString()}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] gap-4">
      <div className="flex flex-col flex-1 shadow-sm border border-gray-100 rounded-xl overflow-hidden bg-white min-h-0">
        <div className="p-4 border-b border-gray-100 bg-white shrink-0 flex justify-between items-center gap-4 w-full">
          <OrderFilters />
          <div className="shrink-0">
            <AddOrderModal
              finishedProducts={finishedProducts || []}
              containers={containersList || []}
              materials={materials}
              stickers={stickers} // 🔥 PASSED STICKERS HERE
            />
          </div>
        </div>

        <div className="overflow-auto flex-1 bg-white">
          <table className="erp-table w-full table-fixed min-w-[1100px]">
            <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
              <tr>
                <th className="w-[14%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Order Number
                </th>
                <th className="w-[10%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Date
                </th>
                <th className="w-[16%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Customer
                </th>
                <th className="w-[16%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Product
                </th>
                {/* 🔥 NEW STICKER COLUMN */}
                <th className="w-[12%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Sticker
                </th>
                <th className="w-[8%] text-center p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Qty (boxes/bkt)
                </th>
                <th className="w-[8%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Rate
                </th>
                <th className="w-[10%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Total
                </th>
                <th className="w-[10%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Est. Profit
                </th>
                <th className="w-[8%] text-center p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {ordersData && ordersData.length > 0 ? (
                ordersData.map((order) => {
                  const dateObj = new Date(order.created_at);
                  const yyyy = dateObj.getFullYear();
                  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
                  const dd = String(dateObj.getDate()).padStart(2, "0");
                  const paddedNum = String(order.order_number).padStart(4, "0");
                  const formattedOrderId = `ORD-${yyyy}${mm}${dd}-${paddedNum}`;

                  const isTotalNegative = Number(order.total_amount) < 0;
                  const isProfitNegative = Number(order.calculated_profit) < 0;

                  return (
                    <tr
                      key={order.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="text-sm font-bold text-[#3F4A90] font-mono tracking-wider">
                          {formattedOrderId}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600 font-medium">
                        {dateObj.toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-[var(--lub-dark)] truncate">
                          {order.customer_name}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-gray-800 text-sm truncate">
                          {order.finished_products?.product_name}{" "}
                          <span className="text-gray-500">
                            ({order.finished_products?.grade_name})
                          </span>
                        </div>
                        <div className="text-xs font-medium text-[var(--lub-gold)] mt-0.5 truncate">
                          Pack: {order.containers?.name}
                        </div>
                      </td>

                      {/* 🔥 STICKER DATA CELL */}
                      <td className="p-4">
                        {order.sticker_id ? (
                          <>
                            <div className="font-semibold text-gray-700 text-[13px] truncate">
                              {order.materials?.name || "Unknown Sticker"}
                            </div>
                            <div className="text-xs text-blue-500 font-medium mt-0.5">
                              {order.sticker_quantity} pcs / bottle
                            </div>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                            No Sticker
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <div className="font-bold text-gray-800">
                          {order.boxes_quantity}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {order.boxes_quantity *
                            (order.containers?.pieces_per_box || 1)}{" "}
                          PCS
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="font-semibold text-gray-700">
                          ₹
                          {Number(order.rate_per_piece).toLocaleString(
                            "en-IN",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          per pc
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div
                          className={`font-black tracking-tight ${isTotalNegative ? "text-red-600" : "text-green-600"}`}
                        >
                          {isTotalNegative ? "- ₹" : "₹"}
                          {Math.abs(Number(order.total_amount)).toLocaleString(
                            "en-IN",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div
                          className={`font-black tracking-tight ${isProfitNegative ? "text-red-600" : "text-green-600"}`}
                        >
                          {isProfitNegative ? "- ₹" : "₹"}
                          {Math.abs(
                            Number(order.calculated_profit || 0),
                          ).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        {/* 🔥 PASSED STICKERS TO EDIT ACTION */}
                        <OrderRowActions order={order} stickers={stickers} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-20 text-gray-400 font-medium"
                  >
                    No sales orders found matching your filters.
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
