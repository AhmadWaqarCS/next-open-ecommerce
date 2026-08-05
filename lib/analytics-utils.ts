import prisma from "@/lib/prisma";

export type RangeKey = "7d" | "30d" | "90d" | "all";

export interface AnalyticsData {
  currencySymbol: string;
  currency: string;
  totalRevenue: number;
  revenueChangePercent: number | null;
  totalOrders: number;
  ordersChangePercent: number | null;
  averageOrderValue: number;
  aovChangePercent: number | null;
  totalItemsSold: number;
  itemsSoldChangePercent: number | null;
  pendingFulfillmentCount: number;
  pendingPaymentCount: number;
  paymentStatusCounts: Record<string, number>;
  fulfillmentStatusCounts: Record<string, number>;
  timeline: Array<{
    dateKey: string;
    label: string;
    revenue: number;
    orders: number;
  }>;
  topProducts: Array<{
    productId: number | null;
    name: string;
    imageUrl: string | null;
    unitsSold: number;
    totalSales: number;
  }>;
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    total: number;
    paymentStatus: string;
    fulfillmentStatus: string;
    placedAt: Date;
    itemCount: number;
  }>;
}

export async function getOrderAnalytics(range: RangeKey = "30d"): Promise<AnalyticsData> {
  // Fetch site config currency
  const siteConfig = await prisma.site_config.findFirst({
    where: { id: 1 },
    select: { currency: true, currency_symbol: true },
  });

  const currencySymbol = siteConfig?.currency_symbol || "$";
  const currency = siteConfig?.currency || "USD";

  const now = new Date();
  let startDate: Date | null = null;
  let prevStartDate: Date | null = null;
  let prevEndDate: Date | null = null;

  if (range === "7d") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    prevStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    prevEndDate = startDate;
  } else if (range === "30d") {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    prevStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    prevEndDate = startDate;
  } else if (range === "90d") {
    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    prevStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    prevEndDate = startDate;
  }

  // Where condition for current period
  const currentWhere: any = {
    deleted_at: null,
  };
  if (startDate) {
    currentWhere.placed_at = { gte: startDate };
  }

  // Where condition for previous period (for growth comparisons)
  const prevWhere: any = {
    deleted_at: null,
  };
  if (prevStartDate && prevEndDate) {
    prevWhere.placed_at = { gte: prevStartDate, lt: prevEndDate };
  }

  // Fetch current period orders
  const currentOrders = await prisma.order.findMany({
    where: currentWhere,
    include: {
      items: true,
    },
    orderBy: { placed_at: "desc" },
  });

  // Fetch previous period orders for comparison (if range is limited)
  const prevOrders = prevStartDate
    ? await prisma.order.findMany({
        where: prevWhere,
        select: {
          total: true,
          cancelled_at: true,
          items: { select: { quantity: true } },
        },
      })
    : [];

  // Current calculations (exclude cancelled orders from revenue calculation)
  const validCurrentOrders = currentOrders.filter((o) => !o.cancelled_at && o.fulfillment_status !== "cancelled");
  const totalRevenue = validCurrentOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const totalOrders = currentOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalItemsSold = validCurrentOrders.reduce((sum, o) => {
    return sum + o.items.reduce((iSum, item) => iSum + item.quantity, 0);
  }, 0);

  // Previous calculations
  let revenueChangePercent: number | null = null;
  let ordersChangePercent: number | null = null;
  let aovChangePercent: number | null = null;
  let itemsSoldChangePercent: number | null = null;

  if (prevStartDate && prevOrders) {
    const validPrevOrders = prevOrders.filter((o) => !o.cancelled_at);
    const prevRevenue = validPrevOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const prevTotalOrders = prevOrders.length;
    const prevAov = prevTotalOrders > 0 ? prevRevenue / prevTotalOrders : 0;
    const prevItemsSold = validPrevOrders.reduce((sum, o) => {
      return sum + o.items.reduce((iSum, item) => iSum + item.quantity, 0);
    }, 0);

    revenueChangePercent = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : totalRevenue > 0 ? 100 : 0;
    ordersChangePercent = prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 : totalOrders > 0 ? 100 : 0;
    aovChangePercent = prevAov > 0 ? ((averageOrderValue - prevAov) / prevAov) * 100 : averageOrderValue > 0 ? 100 : 0;
    itemsSoldChangePercent = prevItemsSold > 0 ? ((totalItemsSold - prevItemsSold) / prevItemsSold) * 100 : totalItemsSold > 0 ? 100 : 0;
  }

  // Pending Action Counts
  const pendingFulfillmentCount = currentOrders.filter((o) => o.fulfillment_status === "unfulfilled" && !o.cancelled_at).length;
  const pendingPaymentCount = currentOrders.filter((o) => o.payment_status === "pending" && !o.cancelled_at).length;

  // Status Distribution
  const paymentStatusCounts: Record<string, number> = {};
  const fulfillmentStatusCounts: Record<string, number> = {};

  currentOrders.forEach((o) => {
    const pStat = o.payment_status || "pending";
    const fStat = o.fulfillment_status || "unfulfilled";
    paymentStatusCounts[pStat] = (paymentStatusCounts[pStat] || 0) + 1;
    fulfillmentStatusCounts[fStat] = (fulfillmentStatusCounts[fStat] || 0) + 1;
  });

  // Build Timeline (daily buckets)
  const timelineMap = new Map<string, { label: string; revenue: number; orders: number }>();

  // Helper to format date keys
  const formatDateKey = (d: Date) => d.toISOString().split("T")[0];
  const formatLabel = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Initialize timeline slots
  if (range === "7d") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = formatDateKey(d);
      timelineMap.set(key, { label: formatLabel(d), revenue: 0, orders: 0 });
    }
  } else if (range === "30d") {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = formatDateKey(d);
      timelineMap.set(key, { label: formatLabel(d), revenue: 0, orders: 0 });
    }
  } else if (range === "90d") {
    // Group into 3-day intervals or weekly to keep chart clean
    for (let i = 89; i >= 0; i -= 3) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = formatDateKey(d);
      timelineMap.set(key, { label: formatLabel(d), revenue: 0, orders: 0 });
    }
  } else {
    // All time: last 12 months or daily if small
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      timelineMap.set(key, { label, revenue: 0, orders: 0 });
    }
  }

  // Populate timeline data from orders
  currentOrders.forEach((o) => {
    const orderDate = new Date(o.placed_at);
    let key = formatDateKey(orderDate);

    if (range === "all") {
      key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}`;
    } else if (range === "90d") {
      // Find nearest key
      const keys = Array.from(timelineMap.keys());
      const matchedKey = keys.find((k) => k >= key) || keys[keys.length - 1];
      if (matchedKey) key = matchedKey;
    }

    if (timelineMap.has(key)) {
      const entry = timelineMap.get(key)!;
      entry.orders += 1;
      if (!o.cancelled_at && o.fulfillment_status !== "cancelled") {
        entry.revenue += Number(o.total || 0);
      }
    }
  });

  const timeline = Array.from(timelineMap.entries()).map(([dateKey, val]) => ({
    dateKey,
    label: val.label,
    revenue: Math.round(val.revenue * 100) / 100,
    orders: val.orders,
  }));

  // Aggregate Top Products
  const productSalesMap = new Map<string, { productId: number | null; name: string; imageUrl: string | null; unitsSold: number; totalSales: number }>();

  validCurrentOrders.forEach((o) => {
    o.items.forEach((item) => {
      const pKey = item.product_id ? `prod-${item.product_id}` : item.product_name;
      if (!productSalesMap.has(pKey)) {
        productSalesMap.set(pKey, {
          productId: item.product_id,
          name: item.product_name,
          imageUrl: item.image_url,
          unitsSold: 0,
          totalSales: 0,
        });
      }
      const pEntry = productSalesMap.get(pKey)!;
      pEntry.unitsSold += item.quantity;
      pEntry.totalSales += Number(item.line_total || 0);
    });
  });

  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 5);

  // Recent Orders (Top 6)
  const recentOrders = currentOrders.slice(0, 6).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    customerName: `${o.customer_first_name} ${o.customer_last_name}`.trim(),
    customerEmail: o.customer_email,
    total: Number(o.total || 0),
    paymentStatus: o.payment_status || "pending",
    fulfillmentStatus: o.fulfillment_status || "unfulfilled",
    placedAt: o.placed_at,
    itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
  }));

  return {
    currencySymbol,
    currency,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    revenueChangePercent: revenueChangePercent !== null ? Math.round(revenueChangePercent * 10) / 10 : null,
    totalOrders,
    ordersChangePercent: ordersChangePercent !== null ? Math.round(ordersChangePercent * 10) / 10 : null,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    aovChangePercent: aovChangePercent !== null ? Math.round(aovChangePercent * 10) / 10 : null,
    totalItemsSold,
    itemsSoldChangePercent: itemsSoldChangePercent !== null ? Math.round(itemsSoldChangePercent * 10) / 10 : null,
    pendingFulfillmentCount,
    pendingPaymentCount,
    paymentStatusCounts,
    fulfillmentStatusCounts,
    timeline,
    topProducts,
    recentOrders,
  };
}
