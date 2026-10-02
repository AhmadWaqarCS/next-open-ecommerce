import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { assertPermission } from "@/lib/guards";
import InvoiceTable from "./invoice-table";
import { resolveUserNames } from "@/lib/action-utils";
import { getInvoicesDashboardDataInDB } from "@/services/invoice-services";
import {
  buildInvoiceWhereInput,
  InvoiceFilterParams,
} from "@/lib/filters/invoice-filters";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoices",
  description: "Manage customer order invoices and track billing",
};

interface PageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function DashboardInvoicesPage(props: PageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardInvoicesPageContent {...props} />
    </Suspense>
  );
}

async function DashboardInvoicesPageContent({
  searchParams,
}: PageProps) {
  const { permissions } = await assertPermission("read", "/dashboard/invoices");
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const where = buildInvoiceWhereInput((params as InvoiceFilterParams) || {});

  const { invoicesRaw, totalInvoices, dashboardUsers } =
    await getInvoicesDashboardDataInDB(where, skipCount, pageSize);

  const userIds = [
    ...invoicesRaw.flatMap((inv) => [inv.created_by, inv.updated_by]),
    ...dashboardUsers.map((u) => u.id),
  ];
  const userNames = await resolveUserNames(userIds);

  const serializedInvoices = invoicesRaw.map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    order_id: inv.order_id,
    order_number: inv.order?.order_number,
    status: inv.status,
    customer_name: inv.customer_name,
    customer_email: inv.customer_email,
    total: Number(inv.total),
    currency: inv.currency,
    issued_at: inv.issued_at.toISOString(),
    paid_at: inv.paid_at ? inv.paid_at.toISOString() : null,
    created_at: inv.created_at.toISOString(),
    created_by: inv.created_by,
    updated_at: inv.updated_at.toISOString(),
    updated_by: inv.updated_by,
  }));

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <InvoiceTable
        invoices={serializedInvoices}
        permissions={permissions}
        userNames={userNames}
        totalCount={totalInvoices}
        currentPage={currentPage}
        pageSize={pageSize}
      />
    </div>
  );
}
