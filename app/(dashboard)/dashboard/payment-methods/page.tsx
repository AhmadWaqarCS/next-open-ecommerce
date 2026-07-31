import { resolveUserNames, serializePaymentMethods } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";
import Pagination from "@/app/(dashboard)/_components/pagination";
import {
  PaymentMethodFilterParams,
  getPaymentMethodFilterWhere,
} from "@/lib/filters/payment-method-filters";
import PaymentMethodsTable from "./payment-methods-table";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Methods",
  description: "Manage store payment options including Cash on Delivery, Stripe, PayPal, and more.",
};

export default async function DashboardPaymentMethodsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { permissions } = await assertPermission("read", "/dashboard/payment-methods");
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const filterParams: PaymentMethodFilterParams = {
    id: typeof params?.id === "string" ? params.id : undefined,
    name: typeof params?.name === "string" ? params.name : undefined,
    description: typeof params?.description === "string" ? params.description : undefined,
    provider: typeof params?.provider === "string" ? params.provider : undefined,
    is_active: typeof params?.is_active === "string" ? params.is_active : undefined,
    created_by: typeof params?.created_by === "string" ? params.created_by : undefined,
    created_from: typeof params?.created_from === "string" ? params.created_from : undefined,
    created_to: typeof params?.created_to === "string" ? params.created_to : undefined,
    updated_by: typeof params?.updated_by === "string" ? params.updated_by : undefined,
    updated_from: typeof params?.updated_from === "string" ? params.updated_from : undefined,
    updated_to: typeof params?.updated_to === "string" ? params.updated_to : undefined,
  };

  const where = await getPaymentMethodFilterWhere(filterParams, false);

  const [paymentMethodsRaw, totalPaymentMethods, dashboardUsers] = await Promise.all([
    prisma.payment_method.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        provider: true,
        provider_config: true,
        extra_charge: true,
        instructions: true,
        is_active: true,
        sort_order: true,
        created_at: true,
        created_by: true,
        updated_at: true,
        updated_by: true,
        deleted_at: true,
        deleted_by: true,
      },
      take: pageSize,
      skip: skipCount,
      orderBy: { sort_order: "asc" },
    }),
    prisma.payment_method.count({ where }),
    prisma.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const paymentMethods = serializePaymentMethods(paymentMethodsRaw);
  const userIds = paymentMethods.flatMap((m) => [m.created_by, m.updated_by]);
  const userNames = await resolveUserNames(userIds);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <PaymentMethodsTable
        paymentMethods={paymentMethods as any}
        dashboardUsers={dashboardUsers}
        filterParams={filterParams}
        permissions={permissions}
        userNames={userNames}
        totalCount={totalPaymentMethods}
      />

      <Pagination
        totalItems={totalPaymentMethods}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="payment methods"
      />
    </div>
  );
}
