import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";
import OrderTable from "./order-table";
import { resolveUserNames, serializeOrders } from "@/lib/action-utils";
import Pagination from "@/app/(dashboard)/_components/pagination";
import { OrderFilterParams, getOrderFilterWhere } from "@/lib/filters/order-filters";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orders",
  description: "View and track customer orders and transactions",
};

export default async function DashboardOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const { permissions } = await assertPermission("read", "/dashboard/orders");
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const filterParams: OrderFilterParams = {
    id: typeof params?.id === "string" ? params.id : undefined,
    order_number: typeof params?.order_number === "string" ? params.order_number : undefined,
    customer_email: typeof params?.customer_email === "string" ? params.customer_email : undefined,
    customer_name: typeof params?.customer_name === "string" ? params.customer_name : undefined,
    customer_phone: typeof params?.customer_phone === "string" ? params.customer_phone : undefined,
    payment_status: typeof params?.payment_status === "string" ? params.payment_status : undefined,
    fulfillment_status: typeof params?.fulfillment_status === "string" ? params.fulfillment_status : undefined,
    payment_method: typeof params?.payment_method === "string" ? params.payment_method : undefined,
    carrier_name: typeof params?.carrier_name === "string" ? params.carrier_name : undefined,
    coupon_code: typeof params?.coupon_code === "string" ? params.coupon_code : undefined,
    tracking_number: typeof params?.tracking_number === "string" ? params.tracking_number : undefined,
    shipping_country: typeof params?.shipping_country === "string" ? params.shipping_country : undefined,
    shipping_city: typeof params?.shipping_city === "string" ? params.shipping_city : undefined,
    has_coupon: typeof params?.has_coupon === "string" ? params.has_coupon : undefined,
    has_tracking: typeof params?.has_tracking === "string" ? params.has_tracking : undefined,
    has_notes: typeof params?.has_notes === "string" ? params.has_notes : undefined,
    min_total: typeof params?.min_total === "string" ? params.min_total : undefined,
    max_total: typeof params?.max_total === "string" ? params.max_total : undefined,
    min_subtotal: typeof params?.min_subtotal === "string" ? params.min_subtotal : undefined,
    max_subtotal: typeof params?.max_subtotal === "string" ? params.max_subtotal : undefined,
    placed_from: typeof params?.placed_from === "string" ? params.placed_from : undefined,
    placed_to: typeof params?.placed_to === "string" ? params.placed_to : undefined,
    paid_from: typeof params?.paid_from === "string" ? params.paid_from : undefined,
    paid_to: typeof params?.paid_to === "string" ? params.paid_to : undefined,
    shipped_from: typeof params?.shipped_from === "string" ? params.shipped_from : undefined,
    shipped_to: typeof params?.shipped_to === "string" ? params.shipped_to : undefined,
    delivered_from: typeof params?.delivered_from === "string" ? params.delivered_from : undefined,
    delivered_to: typeof params?.delivered_to === "string" ? params.delivered_to : undefined,
    created_by: typeof params?.created_by === "string" ? params.created_by : undefined,
    created_from: typeof params?.created_from === "string" ? params.created_from : undefined,
    created_to: typeof params?.created_to === "string" ? params.created_to : undefined,
    updated_by: typeof params?.updated_by === "string" ? params.updated_by : undefined,
    updated_from: typeof params?.updated_from === "string" ? params.updated_from : undefined,
    updated_to: typeof params?.updated_to === "string" ? params.updated_to : undefined,
  };

  const where = await getOrderFilterWhere(filterParams, false);

  const [ordersRaw, totalOrders, dashboardUsers, paymentMethodsRaw] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        id: true,
        order_number: true,
        customer_email: true,
        customer_first_name: true,
        customer_last_name: true,
        customer_phone: true,
        total: true,
        subtotal: true,
        tax_amount: true,
        shipping_cost: true,
        discount_amount: true,
        currency: true,
        payment_method: true,
        payment_method_name: true,
        payment_status: true,
        fulfillment_status: true,
        tracking_number: true,
        tracking_url: true,
        carrier_name: true,
        admin_notes: true,
        customer_notes: true,
        placed_at: true,
        shipped_at: true,
        delivered_at: true,
        cancelled_at: true,
        paid_at: true,
        created_at: true,
        created_by: true,
        updated_at: true,
        updated_by: true,
        items: {
          select: {
            id: true,
            product_name: true,
            variant_name: true,
            quantity: true,
          },
        },
      },
      take: pageSize,
      skip: skipCount,
      orderBy: { placed_at: "desc" },
    }),
    prisma.order.count({ where }),
    prisma.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.payment_method.findMany({
      where: { deleted_at: null },
      select: { provider: true, name: true },
      orderBy: { sort_order: "asc" },
    }),
  ]);

  const orders = serializeOrders(ordersRaw);
  const userIds = orders.flatMap((o) => [o.created_by ?? 0, o.updated_by ?? 0]);
  const userNames = await resolveUserNames(userIds);

  const paymentMethodOptions = paymentMethodsRaw.map((pm) => ({
    label: pm.name,
    value: pm.provider,
  }));

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <OrderTable
        orders={orders as any}
        dashboardUsers={dashboardUsers}
        paymentMethodOptions={paymentMethodOptions}
        filterParams={filterParams}
        permissions={permissions}
        userNames={userNames}
        totalCount={totalOrders}
      />

      <Pagination
        totalItems={totalOrders}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="orders"
      />
    </div>
  );
}
