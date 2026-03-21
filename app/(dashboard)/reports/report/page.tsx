import { createClient } from "@/lib/supabase/server";
import OrderFilters from "@/components/accounting/orders/OrderFilter";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    startDate?: string;
    endDate?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const search = resolvedParams.search || "";
  const startDate = resolvedParams.startDate || "";
  const endDate = resolvedParams.endDate || "";

  const supabase = await createClient();

  // 1. Fetch Orders with related product data
  let query = supabase
    .from("orders")
    .select(
      `
      *,
      finished_products (product_name, grade_name),
      pack_products (name, pieces_per_box)
    `,
    )
    .order("created_at", { ascending: false });

  // 2. ADVANCED SEARCH LOGIC (Checks Customers AND Products)
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

  // 3. Date Filters
  if (startDate) {
    query = query.gte("created_at", `${startDate}T00:00:00.000Z`);
  }
  if (endDate) {
    query = query.lte("created_at", `${endDate}T23:59:59.999Z`);
  }

  const { data: ordersData, error } = await query;

  if (error) console.error("Error fetching report data:", error.message);

  // 4. Calculate Top KPI Cards
  const totalOrders = ordersData?.length || 0;
  const totalBoxes =
    ordersData?.reduce((sum, order) => sum + Number(order.boxes_quantity), 0) ||
    0;
  const totalRevenue =
    ordersData?.reduce((sum, order) => sum + Number(order.total_amount), 0) ||
    0;

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] gap-4">
      

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl shadow-sm">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
            Total Orders
          </p>
          <p className="text-2xl font-black text-emerald-900">{totalOrders}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl shadow-sm">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            Total Quantity Sold
          </p>
          <p className="text-2xl font-black text-blue-900">
            {totalBoxes.toLocaleString("en-IN")}{" "}
            <span className="text-sm font-bold text-blue-600/70">Boxes</span>
          </p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl shadow-sm">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            Total Revenue
          </p>
          <p className="text-2xl font-black text-indigo-900">
            ₹
            {totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Main Content Area: Filters + Table */}
      <div className="flex flex-col flex-1 shadow-sm border border-gray-100 rounded-xl overflow-hidden bg-white min-h-0">
        {/* REUSABLE FILTER COMPONENT */}
        <div className="p-4 border-b border-gray-100 bg-white shrink-0 flex w-full">
          <OrderFilters />
        </div>

        {/* Data Table */}
        <div className="overflow-auto flex-1 bg-white">
          <table className="erp-table w-full table-fixed min-w-[1100px]">
            <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
              <tr>
                <th className="w-[18%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Order Number
                </th>
                <th className="w-[12%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Date
                </th>
                <th className="w-[18%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Customer Name
                </th>
                <th className="w-[22%] text-left p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Product Details
                </th>
                <th className="w-[10%] text-center p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Qty (Boxes)
                </th>
                <th className="w-[10%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Rate/Pc
                </th>
                <th className="w-[10%] text-right p-4 text-xs font-bold text-gray-500 uppercase border-b">
                  Total Amount
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
                        {new Date(order.created_at).toLocaleDateString(
                          "en-GB",
                          { day: "2-digit", month: "2-digit", year: "numeric" },
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-[var(--lub-dark)] truncate">
                          {order.customer_name}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-gray-800 text-sm truncate">
                          {order.finished_products?.product_name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {order.finished_products?.grade_name} -{" "}
                          {order.pack_products?.name}
                        </div>
                      </td>
                      <td className="p-4 text-center font-bold text-gray-800">
                        {order.boxes_quantity}
                      </td>
                      <td className="p-4 text-right text-sm text-gray-600 font-medium">
                        ₹{Number(order.rate_per_piece).toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-black text-gray-800">
                          ₹
                          {Number(order.total_amount).toLocaleString("en-IN", {
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-20 text-gray-400 font-medium"
                  >
                    No order data found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
