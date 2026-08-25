import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import Link from "next/link";
import { notFound } from "next/navigation";
import { assertPermission } from "@/lib/guards";
import InvoiceActionsHeader from "./InvoiceActionsHeader";
import { getInvoiceDetailsDataInDB } from "@/services/invoice-services";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return {
    title: `Invoice #${id}`,
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function InvoiceDetailPage(props: PageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <InvoiceDetailPageContent {...props} />
    </Suspense>
  );
}

async function InvoiceDetailPageContent({
  params,
}: PageProps) {
  await assertPermission("read", "/dashboard/invoices");
  const { id } = await params;

  const invoiceId = parseInt(id, 10);
  if (isNaN(invoiceId) || invoiceId < 1) {
    notFound();
  }

  const { invoice, siteConfig } = await getInvoiceDetailsDataInDB(invoiceId);

  if (!invoice || !invoice.order) {
    notFound();
  }

  const { order, sent_emails } = invoice;
  const storeName = siteConfig?.name || siteConfig?.business_name || "Store";
  const currencySymbol = invoice.currency === "USD" ? "$" : `${invoice.currency} `;

  const isPaid = invoice.status === "paid";

  const pdfData = {
    storeName,
    storeAddress: siteConfig?.address || undefined,
    storeEmail: siteConfig?.email || undefined,
    businessRegNumber: siteConfig?.business_registration_number || undefined,
    invoiceNumber: invoice.invoice_number,
    orderNumber: order.order_number,
    issuedAt: new Date(invoice.issued_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    paidAt: invoice.paid_at
      ? new Date(invoice.paid_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null,
    status: invoice.status,
    customerName: invoice.customer_name,
    customerEmail: invoice.customer_email,
    billingAddress: [
      order.billing_address_line1,
      order.billing_address_line2,
      [order.billing_city, order.billing_state, order.billing_postal_code]
        .filter(Boolean)
        .join(" "),
      order.billing_country,
    ]
      .filter(Boolean)
      .join("\n"),
    paymentMethod: order.payment_method_name || order.payment_method,
    paymentStatus: order.payment_status,
    currency: invoice.currency,
    items: order.items.map((item) => ({
      name: item.product_name,
      variant: item.variant_name || null,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      total: Number(item.line_total),
    })),
    subtotal: Number(invoice.subtotal),
    discountAmount: Number(invoice.discount_amount),
    taxAmount: Number(invoice.tax_amount),
    shippingCost: Number(invoice.shipping_cost),
    total: Number(invoice.total),
    notes: invoice.notes || null,
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
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

        <InvoiceActionsHeader
          invoiceId={invoice.id}
          orderId={order.id}
          customerEmail={invoice.customer_email}
          invoiceNumber={invoice.invoice_number}
          pdfData={pdfData}
        />
      </div>

      {/* Printable Invoice Card */}
      <div
        id="invoice-card"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xs space-y-8 print:shadow-none print:border-none print:p-0"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-6 gap-6">
          <div className="space-y-2">
            {siteConfig?.light_logo_url && (
              <img
                src={siteConfig.light_logo_url}
                alt={storeName}
                className="h-10 object-contain dark:hidden"
              />
            )}
            {siteConfig?.dark_logo_url && (
              <img
                src={siteConfig.dark_logo_url}
                alt={storeName}
                className="h-10 object-contain hidden dark:block"
              />
            )}
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{storeName}</h1>
            {siteConfig?.business_registration_number && (
              <p className="text-xs text-zinc-500">Tax ID / Reg: {siteConfig.business_registration_number}</p>
            )}
            {siteConfig?.address && <p className="text-xs text-zinc-500 max-w-xs">{siteConfig.address}</p>}
            {siteConfig?.email && <p className="text-xs text-zinc-500">{siteConfig.email}</p>}
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span
              className={`inline-block px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider mb-2 ${
                isPaid
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
              }`}
            >
              {invoice.status}
            </span>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{invoice.invoice_number}</h2>
            <p className="text-xs text-zinc-500">Order Ref: <span className="font-semibold">{order.order_number}</span></p>
            <p className="text-xs text-zinc-500">
              Date Issued: {new Date(invoice.issued_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
            {invoice.paid_at && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Paid Date: {new Date(invoice.paid_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            )}
          </div>
        </div>

        {/* Addresses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Billed To</h3>
            <p className="font-bold text-zinc-900 dark:text-zinc-100">{invoice.customer_name}</p>
            <p className="text-zinc-600 dark:text-zinc-400">{invoice.customer_email}</p>
            {order.billing_address_line1 && (
              <p className="text-zinc-600 dark:text-zinc-400">
                {order.billing_address_line1}
                {order.billing_address_line2 ? `, ${order.billing_address_line2}` : ""}
                <br />
                {order.billing_city}, {order.billing_state} {order.billing_postal_code}
                <br />
                {order.billing_country}
              </p>
            )}
          </div>

          <div className="space-y-1 md:text-right">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Payment Details</h3>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{order.payment_method_name || order.payment_method}</p>
            <p className="text-zinc-500 text-xs capitalize">Payment Status: {order.payment_status}</p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                <th className="py-3 px-2">Item</th>
                <th className="py-3 px-2 text-center">Qty</th>
                <th className="py-3 px-2 text-right">Unit Price</th>
                <th className="py-3 px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3.5 px-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 block">{item.product_name}</span>
                    {item.variant_name && <span className="text-xs text-zinc-500 block">{item.variant_name}</span>}
                  </td>
                  <td className="py-3.5 px-2 text-center text-zinc-600 dark:text-zinc-400">{item.quantity}</td>
                  <td className="py-3.5 px-2 text-right text-zinc-600 dark:text-zinc-400">
                    {currencySymbol}{Number(item.unit_price).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-2 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                    {currencySymbol}{Number(item.line_total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Subtotal</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{currencySymbol}{Number(invoice.subtotal).toFixed(2)}</span>
            </div>

            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Discount</span>
                <span className="font-semibold">-{currencySymbol}{Number(invoice.discount_amount).toFixed(2)}</span>
              </div>
            )}

            {Number(invoice.tax_amount) > 0 && (
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Tax</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{currencySymbol}{Number(invoice.tax_amount).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Shipping</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {Number(invoice.shipping_cost) === 0 ? "Free" : `${currencySymbol}${Number(invoice.shipping_cost).toFixed(2)}`}
              </span>
            </div>

            <div className="flex justify-between text-lg font-bold text-zinc-900 dark:text-zinc-100 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <span>Total</span>
              <span>{currencySymbol}{Number(invoice.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
            <span className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Notes:</span>
            <p>{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Sent Email History Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4 print:hidden">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Sent Email Tracking History ({sent_emails.length})
        </h3>

        {sent_emails.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">No email dispatches recorded for this invoice yet.</p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
            {sent_emails.map((email) => (
              <div key={email.id} className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{email.subject}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      {email.type}
                    </span>
                  </div>
                  <p className="text-zinc-500">
                    To: <span className="font-medium text-zinc-700 dark:text-zinc-300">{email.recipient_email}</span> | Sent: {email.sent_at ? new Date(email.sent_at).toLocaleString() : "Pending"}
                  </p>
                  {email.error_message && (
                    <p className="text-rose-600 dark:text-rose-400 font-mono text-[11px] mt-1">Error: {email.error_message}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                      email.status === "successful"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : email.status === "failed"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                    }`}
                  >
                    {email.status}
                  </span>

                  <Link
                    href={`/dashboard/sent-emails/${email.id}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    View HTML Log
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
