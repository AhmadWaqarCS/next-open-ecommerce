"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoiceFormSchema, InvoiceFormInput } from "@/lib/validations";
import { createInvoice, updateInvoice } from "@/actions/invoice-actions";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { setFormErrors } from "@/lib/client-utils";

interface OrderOption {
  id: number;
  order_number: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  subtotal: number | string;
  tax_amount: number | string;
  shipping_cost: number | string;
  discount_amount: number | string;
  total: number | string;
  currency: string;
}

interface InvoiceFormProps {
  initialData?: {
    id: number;
    order_id: number;
    invoice_number: string;
    status: "draft" | "issued" | "paid" | "cancelled";
    customer_name: string;
    customer_email: string;
    subtotal: number;
    tax_amount: number;
    shipping_cost: number;
    discount_amount: number;
    total: number;
    currency: string;
    notes?: string | null;
    due_at?: string | null;
    paid_at?: string | null;
  };
  orders: OrderOption[];
}

export default function InvoiceForm({ initialData, orders }: InvoiceFormProps) {
  const isEditing = Boolean(initialData);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<InvoiceFormInput>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      order_id: initialData?.order_id ?? (orders[0]?.id || 0),
      status: initialData?.status ?? "issued",
      customer_name:
        initialData?.customer_name ??
        (orders[0]
          ? `${orders[0].customer_first_name} ${orders[0].customer_last_name}`.trim()
          : ""),
      customer_email:
        initialData?.customer_email ?? (orders[0]?.customer_email || ""),
      subtotal: initialData?.subtotal ?? Number(orders[0]?.subtotal || 0),
      tax_amount: initialData?.tax_amount ?? Number(orders[0]?.tax_amount || 0),
      shipping_cost:
        initialData?.shipping_cost ?? Number(orders[0]?.shipping_cost || 0),
      discount_amount:
        initialData?.discount_amount ?? Number(orders[0]?.discount_amount || 0),
      total: initialData?.total ?? Number(orders[0]?.total || 0),
      currency: initialData?.currency ?? (orders[0]?.currency || "USD"),
      notes: initialData?.notes ?? "",
      due_at: initialData?.due_at
        ? new Date(initialData.due_at).toISOString().split("T")[0]
        : "",
      paid_at: initialData?.paid_at
        ? new Date(initialData.paid_at).toISOString().split("T")[0]
        : "",
    },
  });

  const handleOrderChange = (orderIdNum: number) => {
    const selected = orders.find((o) => o.id === orderIdNum);
    if (selected && !isEditing) {
      form.setValue(
        "customer_name",
        `${selected.customer_first_name} ${selected.customer_last_name}`.trim(),
      );
      form.setValue("customer_email", selected.customer_email);
      form.setValue("subtotal", Number(selected.subtotal));
      form.setValue("tax_amount", Number(selected.tax_amount));
      form.setValue("shipping_cost", Number(selected.shipping_cost));
      form.setValue("discount_amount", Number(selected.discount_amount));
      form.setValue("total", Number(selected.total));
      form.setValue("currency", selected.currency);
    }
  };

  const onSubmit = (values: InvoiceFormInput) => {
    setGlobalError(null);
    startTransition(async () => {
      let res;
      if (isEditing && initialData) {
        res = await updateInvoice(initialData.id, values);
      } else {
        res = await createInvoice(values);
      }

      if (res.success) {
        toast.action(
          res,
          isEditing ? "Invoice updated successfully." : "Invoice created successfully.",
        );
        router.push("/dashboard/invoices");
        router.refresh();
      } else {
        setGlobalError(res.message || "An error occurred while saving the invoice.");
        if (res.errors) {
          setFormErrors(res.errors, form.setError);
        }
        toast.error(res.message || "Failed to save invoice.");
      }
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 flex flex-col">
      <div className="bg-dashboard-card border border-dashboard-border rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
        {/* Header with Top-Right Save Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dashboard-border-subtle pb-4">
          <div>
            <h2 className="text-xl font-bold text-dashboard-fg">
              {isEditing
                ? `Edit Invoice (${initialData?.invoice_number})`
                : "Create New Invoice"}
            </h2>
            <p className="text-xs text-dashboard-muted mt-0.5">
              {isEditing
                ? "Update line amounts, status, dates, or notes."
                : "Generate an invoice for an un-invoiced order."}
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <Link
              href="/dashboard/invoices"
              className="px-4 py-2 text-sm font-semibold text-dashboard-muted hover:text-dashboard-fg hover:bg-dashboard-card-hover rounded-xl transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-dashboard-primary-fg bg-dashboard-primary hover:bg-dashboard-primary-hover rounded-xl transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {isPending && (
                <svg
                  className="animate-spin h-4 w-4 text-dashboard-primary-fg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              <span>
                {isPending
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Create Invoice"}
              </span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {globalError && (
          <div className="p-4 rounded-xl bg-dashboard-danger-subtle border border-dashboard-danger/30 text-dashboard-danger-fg text-sm flex items-start gap-2">
            <svg
              className="h-5 w-5 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{globalError}</span>
          </div>
        )}

        {/* Order Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-dashboard-muted mb-1">
            Associated Order *
          </label>
          <select
            {...form.register("order_id", { valueAsNumber: true })}
            disabled={isEditing}
            onChange={(e) => {
              const val = Number(e.target.value);
              form.setValue("order_id", val);
              handleOrderChange(val);
            }}
            className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg text-sm focus:ring-2 focus:ring-dashboard-primary outline-none disabled:opacity-60"
          >
            {orders.length === 0 && !isEditing ? (
              <option value={0}>No un-invoiced orders available</option>
            ) : (
              orders.map((o) => (
                <option key={o.id} value={o.id}>
                  Order #{o.order_number} — {o.customer_first_name}{" "}
                  {o.customer_last_name} (${Number(o.total).toFixed(2)})
                </option>
              ))
            )}
          </select>
          {form.formState.errors.order_id && (
            <p className="text-xs text-dashboard-danger mt-1">
              {form.formState.errors.order_id.message}
            </p>
          )}
        </div>

        {/* Customer Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-dashboard-muted mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              {...form.register("customer_name")}
              placeholder="e.g. John Doe"
              className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted text-sm focus:ring-2 focus:ring-dashboard-primary outline-none"
            />
            {form.formState.errors.customer_name && (
              <p className="text-xs text-dashboard-danger mt-1">
                {form.formState.errors.customer_name.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-dashboard-muted mb-1">
              Customer Email *
            </label>
            <input
              type="email"
              {...form.register("customer_email")}
              placeholder="customer@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted text-sm focus:ring-2 focus:ring-dashboard-primary outline-none"
            />
            {form.formState.errors.customer_email && (
              <p className="text-xs text-dashboard-danger mt-1">
                {form.formState.errors.customer_email.message}
              </p>
            )}
          </div>
        </div>

        {/* Status & Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-dashboard-muted mb-1">
              Invoice Status *
            </label>
            <select
              {...form.register("status")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg text-sm focus:ring-2 focus:ring-dashboard-primary outline-none"
            >
              <option value="issued">Issued</option>
              <option value="paid">Paid</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-dashboard-muted mb-1">
              Currency
            </label>
            <input
              type="text"
              {...form.register("currency")}
              placeholder="USD"
              className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted text-sm focus:ring-2 focus:ring-dashboard-primary outline-none uppercase"
            />
          </div>
        </div>

        {/* Financial Amounts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-dashboard-muted mb-1">
              Subtotal *
            </label>
            <input
              type="number"
              step="0.01"
              {...form.register("subtotal", { valueAsNumber: true })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg text-sm focus:ring-2 focus:ring-dashboard-primary outline-none"
            />
            {form.formState.errors.subtotal && (
              <p className="text-xs text-dashboard-danger mt-1">
                {form.formState.errors.subtotal.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-dashboard-muted mb-1">
              Tax Amount
            </label>
            <input
              type="number"
              step="0.01"
              {...form.register("tax_amount", { valueAsNumber: true })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg text-sm focus:ring-2 focus:ring-dashboard-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-dashboard-muted mb-1">
              Shipping Cost
            </label>
            <input
              type="number"
              step="0.01"
              {...form.register("shipping_cost", { valueAsNumber: true })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg text-sm focus:ring-2 focus:ring-dashboard-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-dashboard-muted mb-1">
              Discount Amount
            </label>
            <input
              type="number"
              step="0.01"
              {...form.register("discount_amount", { valueAsNumber: true })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg text-sm focus:ring-2 focus:ring-dashboard-primary outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-dashboard-muted mb-1">
            Grand Total *
          </label>
          <input
            type="number"
            step="0.01"
            {...form.register("total", { valueAsNumber: true })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg text-sm font-bold focus:ring-2 focus:ring-dashboard-primary outline-none"
          />
          {form.formState.errors.total && (
            <p className="text-xs text-dashboard-danger mt-1">
              {form.formState.errors.total.message}
            </p>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-dashboard-muted mb-1">
              Due Date
            </label>
            <input
              type="date"
              {...form.register("due_at")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg text-sm focus:ring-2 focus:ring-dashboard-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-dashboard-muted mb-1">
              Paid Date
            </label>
            <input
              type="date"
              {...form.register("paid_at")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg text-sm focus:ring-2 focus:ring-dashboard-primary outline-none"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-dashboard-muted mb-1">
            Invoice Notes
          </label>
          <textarea
            rows={3}
            {...form.register("notes")}
            placeholder="Optional terms, bank details, or internal notes..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted text-sm focus:ring-2 focus:ring-dashboard-primary outline-none"
          />
        </div>
      </div>
    </form>
  );
}
