import Link from "next/link";
import { notFound } from "next/navigation";
import { assertPermission } from "@/lib/guards";
import InvoiceForm from "../../_components/invoice-form";
import { getInvoiceEditDataInDB } from "@/services/invoice-services";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: `Edit Invoice #${id}`,
  };
}

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await assertPermission("update", "/dashboard/invoices");
  const { id } = await params;

  const invoiceId = parseInt(id, 10);
  if (isNaN(invoiceId) || invoiceId < 1) {
    notFound();
  }

  const { invoice, ordersRaw } = await getInvoiceEditDataInDB(invoiceId);

  if (!invoice) {
    notFound();
  }

  const orders = ordersRaw.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    customer_first_name: o.customer_first_name,
    customer_last_name: o.customer_last_name,
    customer_email: o.customer_email,
    subtotal: Number(o.subtotal),
    tax_amount: Number(o.tax_amount),
    shipping_cost: Number(o.shipping_cost),
    discount_amount: Number(o.discount_amount),
    total: Number(o.total),
    currency: o.currency,
  }));

  const initialData = {
    id: invoice.id,
    order_id: invoice.order_id,
    invoice_number: invoice.invoice_number,
    status: invoice.status as "draft" | "issued" | "paid" | "cancelled",
    customer_name: invoice.customer_name,
    customer_email: invoice.customer_email,
    subtotal: Number(invoice.subtotal),
    tax_amount: Number(invoice.tax_amount),
    shipping_cost: Number(invoice.shipping_cost),
    discount_amount: Number(invoice.discount_amount),
    total: Number(invoice.total),
    currency: invoice.currency,
    notes: invoice.notes,
    due_at: invoice.due_at ? invoice.due_at.toISOString() : null,
    paid_at: invoice.paid_at ? invoice.paid_at.toISOString() : null,
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Edit Invoice
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Update invoice details for {invoice.invoice_number}
          </p>
        </div>
        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Invoices
        </Link>
      </div>

      <InvoiceForm initialData={initialData} orders={orders} />
    </div>
  );
}
