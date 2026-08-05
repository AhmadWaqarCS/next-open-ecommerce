import { assertPermission } from "@/lib/guards";
import { getOrderAnalytics, RangeKey } from "@/lib/analytics-utils";
import OrderAnalyticsChart from "./_components/order-analytics-chart";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - Order Analysis",
  description: "Next OpenSource Ecommerce Dashboard & Order Analytics",
};

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams?: Promise<{
    range?: string;
  }>;
}) {
  await assertPermission("read", "/dashboard");

  const params = await searchParams;
  const rangeParam = (params?.range || "30d") as RangeKey;
  const validRanges: RangeKey[] = ["7d", "30d", "90d", "all"];
  const range: RangeKey = validRanges.includes(rangeParam) ? rangeParam : "30d";

  const analytics = await getOrderAnalytics(range);

  const rangeLabels: Record<RangeKey, string> = {
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "90d": "Last 90 Days",
    all: "All Time",
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Top Banner & Header Navigation Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-3 border border-indigo-100 dark:border-indigo-900/50">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Ecommerce Analytics
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Store Analytics & Orders Overview
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Track real-time sales revenue, monitor fulfillment pipelines, and evaluate product performance metrics.
            </p>
          </div>

          {/* Range Selector Pills */}
          <div className="flex flex-wrap items-center gap-2 bg-zinc-100 dark:bg-zinc-800/60 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700/50 self-start lg:self-center">
            {validRanges.map((r) => {
              const isActive = range === r;
              return (
                <Link
                  key={r}
                  href={`/dashboard?range=${r}`}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                    isActive
                      ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  {rangeLabels[r]}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-linear-to-l from-indigo-500/5 to-transparent pointer-events-none hidden lg:block" />
      </div>

      {/* Actionable Alerts Bar if pending orders exist */}
      {(analytics.pendingFulfillmentCount > 0 || analytics.pendingPaymentCount > 0) && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <span className="font-bold">Attention Required: </span>
              <span>
                {analytics.pendingFulfillmentCount > 0 && (
                  <strong className="underline font-semibold">{analytics.pendingFulfillmentCount} order(s) pending fulfillment</strong>
                )}
                {analytics.pendingFulfillmentCount > 0 && analytics.pendingPaymentCount > 0 && " and "}
                {analytics.pendingPaymentCount > 0 && (
                  <span>{analytics.pendingPaymentCount} order(s) with pending payment</span>)}
                .
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/orders?fulfillment_status=unfulfilled"
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-zinc-950 transition-colors shrink-0"
          >
            Review Orders &rarr;
          </Link>
        </div>
      )}

      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenue */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {analytics.currencySymbol}
              {analytics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {analytics.revenueChangePercent !== null ? (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    analytics.revenueChangePercent >= 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400"
                  }`}
                >
                  {analytics.revenueChangePercent >= 0 ? "+" : ""}
                  {analytics.revenueChangePercent}%
                </span>
              ) : null}
              <span className="text-[11px] text-zinc-400">vs prev. period</span>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Total Orders
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {analytics.totalOrders.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {analytics.ordersChangePercent !== null ? (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    analytics.ordersChangePercent >= 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400"
                  }`}
                >
                  {analytics.ordersChangePercent >= 0 ? "+" : ""}
                  {analytics.ordersChangePercent}%
                </span>
              ) : null}
              <span className="text-[11px] text-zinc-400">vs prev. period</span>
            </div>
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Avg Order Value
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {analytics.currencySymbol}
              {analytics.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {analytics.aovChangePercent !== null ? (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    analytics.aovChangePercent >= 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400"
                  }`}
                >
                  {analytics.aovChangePercent >= 0 ? "+" : ""}
                  {analytics.aovChangePercent}%
                </span>
              ) : null}
              <span className="text-[11px] text-zinc-400">per order average</span>
            </div>
          </div>
        </div>

        {/* Total Items Sold */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Items Sold
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {analytics.totalItemsSold.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {analytics.itemsSoldChangePercent !== null ? (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    analytics.itemsSoldChangePercent >= 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400"
                  }`}
                >
                  {analytics.itemsSoldChangePercent >= 0 ? "+" : ""}
                  {analytics.itemsSoldChangePercent}%
                </span>
              ) : null}
              <span className="text-[11px] text-zinc-400">units fulfilled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Section: Left (Chart + Recent Orders) & Right (Status Breakdown + Top Selling Products) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Revenue Chart Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs">
            <OrderAnalyticsChart
              timeline={analytics.timeline}
              currencySymbol={analytics.currencySymbol}
            />
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Recent Orders
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Latest customer purchases and status summary
                </p>
              </div>
              <Link
                href="/dashboard/orders"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                View All ({analytics.totalOrders}) &rarr;
              </Link>
            </div>

            {analytics.recentOrders.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-sm">
                No orders recorded in this time range.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 uppercase tracking-wider font-semibold">
                      <th className="pb-3 pr-4">Order #</th>
                      <th className="pb-3 px-4">Customer</th>
                      <th className="pb-3 px-4">Date</th>
                      <th className="pb-3 px-4">Payment</th>
                      <th className="pb-3 px-4">Fulfillment</th>
                      <th className="pb-3 pl-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium text-zinc-700 dark:text-zinc-300">
                    {analytics.recentOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3.5 pr-4 font-bold text-indigo-600 dark:text-indigo-400">
                          <Link href={`/dashboard/orders/${ord.id}`} className="hover:underline">
                            {ord.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{ord.customerName}</div>
                          <div className="text-[11px] text-zinc-400">{ord.customerEmail}</div>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-500 whitespace-nowrap">
                          {new Date(ord.placedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                              ord.paymentStatus === "paid"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400"
                                : ord.paymentStatus === "pending"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-400"
                            }`}
                          >
                            {ord.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                              ord.fulfillmentStatus === "delivered"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-400"
                                : ord.fulfillmentStatus === "shipped"
                                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-400"
                                : ord.fulfillmentStatus === "unfulfilled"
                                ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-400"
                            }`}
                          >
                            {ord.fulfillmentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 pl-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                          {analytics.currencySymbol}
                          {ord.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col) */}
        <div className="space-y-8">
          {/* Order Status Breakdown */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Order Statuses
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Fulfillment and payment breakdown
              </p>
            </div>

            {/* Fulfillment Status Progress Bars */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Fulfillment Status
              </h4>
              {[
                { label: "Unfulfilled", key: "unfulfilled", color: "bg-amber-500" },
                { label: "Processing", key: "processing", color: "bg-indigo-500" },
                { label: "Shipped", key: "shipped", color: "bg-blue-500" },
                { label: "Delivered", key: "delivered", color: "bg-emerald-500" },
                { label: "Cancelled", key: "cancelled", color: "bg-rose-500" },
              ].map((st) => {
                const count = analytics.fulfillmentStatusCounts[st.key] || 0;
                const percent = analytics.totalOrders > 0 ? (count / analytics.totalOrders) * 100 : 0;
                return (
                  <div key={st.key} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-zinc-700 dark:text-zinc-300">{st.label}</span>
                      <span className="text-zinc-400 font-semibold">{count} ({Math.round(percent)}%)</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${st.color} rounded-full transition-all duration-300`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Payment Status
              </h4>
              {[
                { label: "Paid", key: "paid", color: "bg-emerald-500" },
                { label: "Pending", key: "pending", color: "bg-amber-500" },
                { label: "Failed", key: "failed", color: "bg-rose-500" },
                { label: "Refunded", key: "refunded", color: "bg-purple-500" },
              ].map((st) => {
                const count = analytics.paymentStatusCounts[st.key] || 0;
                const percent = analytics.totalOrders > 0 ? (count / analytics.totalOrders) * 100 : 0;
                return (
                  <div key={st.key} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-zinc-700 dark:text-zinc-300">{st.label}</span>
                      <span className="text-zinc-400 font-semibold">{count} ({Math.round(percent)}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${st.color} rounded-full transition-all duration-300`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Selling Products Leaderboard */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Top Selling Products
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Best performing products by revenue
              </p>
            </div>

            {analytics.topProducts.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-xs">
                No product sales recorded in this range.
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.topProducts.map((prod, idx) => (
                  <div
                    key={prod.productId || idx}
                    className="flex items-center gap-3 p-2 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 shrink-0 overflow-hidden flex items-center justify-center border border-zinc-200 dark:border-zinc-700/50">
                      {prod.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {prod.name}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {prod.unitsSold} {prod.unitsSold === 1 ? "unit" : "units"} sold
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                        {analytics.currencySymbol}
                        {prod.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Dashboard Management Shortcuts */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Quick Management Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                href="/dashboard/products"
                className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-zinc-700 dark:text-zinc-300 font-semibold transition-colors flex items-center justify-between"
              >
                <span>Products</span>
                <span className="text-zinc-400">&rarr;</span>
              </Link>
              <Link
                href="/dashboard/categories"
                className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-zinc-700 dark:text-zinc-300 font-semibold transition-colors flex items-center justify-between"
              >
                <span>Categories</span>
                <span className="text-zinc-400">&rarr;</span>
              </Link>
              <Link
                href="/dashboard/coupons"
                className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-zinc-700 dark:text-zinc-300 font-semibold transition-colors flex items-center justify-between"
              >
                <span>Coupons</span>
                <span className="text-zinc-400">&rarr;</span>
              </Link>
              <Link
                href="/dashboard/shipping"
                className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-zinc-700 dark:text-zinc-300 font-semibold transition-colors flex items-center justify-between"
              >
                <span>Shipping</span>
                <span className="text-zinc-400">&rarr;</span>
              </Link>
              <Link
                href="/dashboard/users"
                className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-zinc-700 dark:text-zinc-300 font-semibold transition-colors flex items-center justify-between"
              >
                <span>Users</span>
                <span className="text-zinc-400">&rarr;</span>
              </Link>
              <Link
                href="/dashboard/roles"
                className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-zinc-700 dark:text-zinc-300 font-semibold transition-colors flex items-center justify-between"
              >
                <span>Roles</span>
                <span className="text-zinc-400">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
