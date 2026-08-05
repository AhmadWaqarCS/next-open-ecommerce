import { assertPermission } from "@/lib/guards";
import InvoiceTable from "./invoice-table";
import { resolveUserNames } from "@/lib/action-utils";
import Pagination from "@/app/(dashboard)/_components/pagination";
import { getInvoicesDashboardDataInDB } from "@/services/invoice-services";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoices",
  description: "Manage customer order invoices and track billing",
};

export default async function DashboardInvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { permissions } = await assertPermission("read", "/dashboard/invoices");
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const where: any = { deleted_at: null };
  if (
    typeof params?.invoice_number === "string" &&
    params.invoice_number.trim()
  ) {
    where.invoice_number = {
      contains: params.invoice_number.trim(),
      mode: "insensitive",
    };
  }
  if (
    typeof params?.customer_email === "string" &&
    params.customer_email.trim()
  ) {
    where.customer_email = {
      contains: params.customer_email.trim(),
      mode: "insensitive",
    };
  }
  if (
    typeof params?.customer_name === "string" &&
    params.customer_name.trim()
  ) {
    where.customer_name = {
      contains: params.customer_name.trim(),
      mode: "insensitive",
    };
  }
  if (typeof params?.status === "string" && params.status.trim()) {
    where.status = params.status.trim();
  }

  const { invoicesRaw, totalInvoices, dashboardUsers } =
    await getInvoicesDashboardDataInDB(where, skipCount, pageSize);

  const userIds = invoicesRaw.flatMap((inv) => [
    inv.created_by,
    inv.updated_by,
  ]);
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
        filterParams={params as any}
        permissions={permissions}
        userNames={userNames}
        totalCount={totalInvoices}
      />

      <Pagination
        totalItems={totalInvoices}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="invoices"
      />
    </div>
  );
}
