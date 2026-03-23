import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: accounting } = await supabase
    .from("accounting_entries")
    .select("entry_type, amount");

  const totalIncome =
    accounting
      ?.filter((a) => a.entry_type === "Income")
      .reduce((sum, a) => sum + Number(a.amount), 0) || 0;

  const totalExpense =
    accounting
      ?.filter((a) => a.entry_type === "Expense")
      .reduce((sum, a) => sum + Number(a.amount), 0) || 0;

  const { data: recentOrders, count: orderCount } = await supabase
    .from("orders")
    .select("order_number, customer_name, total_amount, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: allMaterials } = await supabase
    .from("materials")
    .select("name, stock, unit, type");
  const { data: allContainers } = await supabase
    .from("containers")
    .select("name, stock");
  const { data: allProducts } = await supabase
    .from("finished_products")
    .select("product_name, stock, unit");

  const outOfStockAlerts = [
    ...(allProducts || [])
      .filter((p) => Number(p.stock) <= 0)
      .map((p) => ({
        name: p.product_name,
        stock: p.stock,
        type: "Finished Product",
        unit: p.unit,
      })),
    ...(allMaterials || [])
      .filter((m) => Number(m.stock) <= 0)
      .map((m) => ({
        name: m.name,
        stock: m.stock,
        type: m.type,
        unit: m.unit,
      })),
    ...(allContainers || [])
      .filter((c) => Number(c.stock) <= 0)
      .map((c) => ({
        name: c.name,
        stock: c.stock,
        type: "Container",
        unit: "PCS",
      })),
  ];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const totalCashflow = totalIncome + totalExpense;
  const incomePercent =
    totalCashflow === 0 ? 0 : (totalIncome / totalCashflow) * 100;
  const expensePercent =
    totalCashflow === 0 ? 0 : (totalExpense / totalCashflow) * 100;

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 flex flex-col justify-center min-w-0 transition-transform hover:-translate-y-1">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">
            Total Income
          </p>
          <p className="text-2xl lg:text-3xl font-black text-green-500 truncate">
            {formatCurrency(totalIncome)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 flex flex-col justify-center min-w-0 transition-transform hover:-translate-y-1">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">
            Total Expenses
          </p>
          <p className="text-2xl lg:text-3xl font-black text-red-500 truncate">
            {formatCurrency(totalExpense)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 flex flex-col justify-center min-w-0 transition-transform hover:-translate-y-1">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">
            Total Orders Fulfilled
          </p>
          <p className="text-2xl lg:text-3xl font-black text-[var(--lub-dark)] truncate">
            {orderCount || 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        <div className="lg:col-span-2 space-y-6 min-w-0 flex flex-col">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-w-0">
            <h2 className="text-lg font-bold text-[#3F4A90] mb-4">
              Financial Overview
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-green-600">
                  Income ({incomePercent.toFixed(1)}%)
                </span>
                <span className="text-red-500">
                  Expenses ({expensePercent.toFixed(1)}%)
                </span>
              </div>

              <div className="h-6 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                <div
                  className="h-full bg-green-500 transition-all duration-1000 ease-out"
                  style={{ width: `${incomePercent}%` }}
                ></div>
                <div
                  className="h-full bg-red-500 transition-all duration-1000 ease-out"
                  style={{ width: `${expensePercent}%` }}
                ></div>
              </div>

              <div className="flex justify-between text-xs text-gray-400 font-medium">
                <span>{formatCurrency(totalIncome)}</span>
                <span>{formatCurrency(totalExpense)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-w-0 flex-1 flex flex-col">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#3F4A90]">Recent Sales</h2>
              <Link
                href="/accounting/orders"
                className="text-sm font-bold text-[var(--lub-gold)] hover:underline"
              >
                View All Orders
              </Link>
            </div>
            <div className="p-6 overflow-x-auto w-full">
              <table className="w-full text-left text-sm text-gray-600 min-w-[500px]">
                <thead className="bg-gray-50/50 text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 font-bold border-b border-gray-100 rounded-tl-lg">
                      Order #
                    </th>
                    <th className="px-4 py-3 font-bold border-b border-gray-100">
                      Customer
                    </th>
                    <th className="px-4 py-3 font-bold border-b border-gray-100">
                      Date
                    </th>
                    <th className="px-4 py-3 font-bold border-b border-gray-100 text-right rounded-tr-lg">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders?.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-gray-400 font-medium"
                      >
                        No orders yet.
                      </td>
                    </tr>
                  ) : (
                    recentOrders?.map((order) => {
                      const dateObj = new Date(order.created_at);
                      const yyyy = dateObj.getFullYear();
                      const mm = String(dateObj.getMonth() + 1).padStart(
                        2,
                        "0",
                      );
                      const dd = String(dateObj.getDate()).padStart(2, "0");
                      const paddedNum = String(order.order_number).padStart(
                        4,
                        "0",
                      );
                      const formattedOrderId = `ORD-${yyyy}${mm}${dd}-${paddedNum}`;

                      return (
                        <tr
                          key={order.order_number}
                          className="hover:bg-blue-50/30 transition-colors"
                        >
                          <td className="px-4 py-3 font-bold text-[#3F4A90] font-mono whitespace-nowrap">
                            {formattedOrderId}
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-700 truncate max-w-[150px]">
                            {order.customer_name}
                          </td>
                          <td className="px-4 py-3 font-medium whitespace-nowrap">
                            {dateObj.toLocaleDateString("en-GB")}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-green-600 whitespace-nowrap">
                            {formatCurrency(order.total_amount)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-w-0 flex flex-col h-full max-h-[750px]">
          <h2 className="text-lg font-bold text-red-600 mb-1 flex items-center gap-2">
            Out of Stock Alerts
          </h2>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {outOfStockAlerts.length === 0 ? (
              <div className="p-6 text-center text-green-600 bg-green-50 rounded-lg border border-green-100 font-bold">
                No out-of-stock items!
              </div>
            ) : (
              outOfStockAlerts.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-red-50 border border-red-100 rounded-lg flex justify-between items-center gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-red-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mt-0.5 truncate">
                      Category: {item.type}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-red-600 leading-none mb-1">
                      0
                    </p>
                    <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider">
                      {item.unit}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="pt-4 mt-4 border-t border-gray-100 shrink-0">
            <Link
              href="/materials/raw-materials"
              className="block w-full text-center text-sm font-bold text-[#3F4A90] hover:text-[var(--lub-gold)] transition-colors"
            >
              Manage Inventory →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
