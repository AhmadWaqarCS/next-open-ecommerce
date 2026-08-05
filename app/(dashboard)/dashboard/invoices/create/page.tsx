import Link from "next/link";
import { assertPermission } from "@/lib/guards";
import InvoiceForm from "../_components/invoice-form";
import { getInvoiceCreateDataInDB } from "@/services/invoice-services";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Invoice",
  description: "Create a new order invoice",
};

export default async function CreateInvoicePage() {
  await assertPermission("create", "/dashboard/invoices");

  const ordersRaw = await getInvoiceCreateDataInDB();

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

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Create Invoice
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Generate a new custom or order invoice for a customer
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

      <InvoiceForm orders={orders} />
    </div>
  );
}
