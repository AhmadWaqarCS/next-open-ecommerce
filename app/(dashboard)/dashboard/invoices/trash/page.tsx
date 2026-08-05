import { assertPermission } from "@/lib/guards";
import InvoiceTrashTable from "./invoice-trash-table";
import { resolveUserNames } from "@/lib/action-utils";
import Pagination from "@/app/(dashboard)/_components/pagination";
import { getInvoiceTrashDashboardDataInDB } from "@/services/invoice-services";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trash — Invoices",
  description: "Deleted customer order invoices",
};

interface TrashedInvoice {
  id: number;
  invoice_number: string;
  customer_email: string;
  total: number;
  currency: string;
  deleted_at: string;
  created_at: string;
  created_by: number;
  updated_at: string;
  updated_by: number;
  deleted_by: number;
}

export default async function DashboardInvoicesTrashPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { permissions } = await assertPermission("delete", "/dashboard/invoices");
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const where: any = { NOT: { deleted_at: null } };
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

  const { invoicesRaw, totalInvoices } =
    await getInvoiceTrashDashboardDataInDB(where, skipCount, pageSize);

  const userIds = invoicesRaw.flatMap((inv) => [inv.created_by, inv.updated_by, inv.deleted_by ?? 0]);
  const userNames = await resolveUserNames(userIds);

  const formattedInvoices: TrashedInvoice[] = invoicesRaw.map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    customer_email: inv.customer_email,
    total: Number(inv.total),
    currency: inv.currency,
    deleted_at: inv.deleted_at?.toISOString() || "",
    created_at: inv.created_at.toISOString(),
    created_by: inv.created_by,
    updated_at: inv.updated_at.toISOString(),
    updated_by: inv.updated_by,
    deleted_by: inv.deleted_by ?? 0,
  }));

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <InvoiceTrashTable
        invoices={formattedInvoices}
        permissions={permissions}
        userNames={userNames}
        totalCount={totalInvoices}
      />

      <Pagination
        totalItems={totalInvoices}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="deleted invoices"
      />
    </div>
  );
}
