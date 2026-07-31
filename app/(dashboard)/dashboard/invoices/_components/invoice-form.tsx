"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoiceFormSchema, InvoiceFormInput } from "@/lib/validations";
import { createInvoice, updateInvoice } from "@/actions/invoice-actions";
import { useToast } from "@/app/(dashboard)/_components/toast-context";

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
    startTransition(async () => {
      let res;
      if (isEditing && initialData) {
        res = await updateInvoice(initialData.id, values);
      } else {
        res = await createInvoice(values);
      }

      if (res.success) {
        toast(
          res.message || (isEditing ? "Invoice updated" : "Invoice created"),
          "success",
        );
        router.push("/dashboard/invoices");
        router.refresh();
      } else {
        toast(res.message || "An error occurred", "error");
        if (res.errors) {
          Object.entries(res.errors).forEach(([field, msg]) => {
            form.setError(field as any, { message: msg });
          });
        }
      }
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 flex flex-col">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          {isEditing
            ? `Edit Invoice (${initialData?.invoice_number})`
            : "Create New Invoice"}
        </h2>

        {/* Order Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
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
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60"
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                Order #{o.order_number} — {o.customer_first_name}{" "}
                {o.customer_last_name} (${Number(o.total).toFixed(2)})
              </option>
            ))}
          </select>
          {form.formState.errors.order_id && (
            <p className="text-xs text-rose-600 mt-1">
              {form.formState.errors.order_id.message}
            </p>
          )}
        </div>

        {/* Customer Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              {...form.register("customer_name")}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {form.formState.errors.customer_name && (
              <p className="text-xs text-rose-600 mt-1">
                {form.formState.errors.customer_name.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
              Customer Email *
            </label>
            <input
              type="email"
              {...form.register("customer_email")}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {form.formState.errors.customer_email && (
              <p className="text-xs text-rose-600 mt-1">
                {form.formState.errors.customer_email.message}
              </p>
            )}
          </div>
        </div>

        {/* Status & Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
              Invoice Status *
            </label>
            <select
              {...form.register("status")}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="issued">Issued</option>
              <option value="paid">Paid</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
              Currency
            </label>
            <input
              type="text"
              {...form.register("currency")}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
            />
          </div>
        </div>

        {/* Financial Amounts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
              Subtotal *
            </label>
            <input
              type="number"
              step="0.01"
              {...form.register("subtotal", { valueAsNumber: true })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
              Tax Amount
            </label>
            <input
              type="number"
              step="0.01"
              {...form.register("tax_amount", { valueAsNumber: true })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
              Shipping Cost
            </label>
            <input
              type="number"
              step="0.01"
              {...form.register("shipping_cost", { valueAsNumber: true })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
              Discount Amount
            </label>
            <input
              type="number"
              step="0.01"
              {...form.register("discount_amount", { valueAsNumber: true })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
            Grand Total *
          </label>
          <input
            type="number"
            step="0.01"
            {...form.register("total", { valueAsNumber: true })}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
              Due Date
            </label>
            <input
              type="date"
              {...form.register("due_at")}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
              Paid Date
            </label>
            <input
              type="date"
              {...form.register("paid_at")}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
            Invoice Notes
          </label>
          <textarea
            rows={3}
            {...form.register("notes")}
            placeholder="Optional terms, bank details, or notes..."
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <Link
            href="/dashboard/invoices"
            className="px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
          >
            {isPending
              ? "Saving..."
              : isEditing
                ? "Update Invoice"
                : "Create Invoice"}
          </button>
        </div>
      </div>
    </form>
  );
}
