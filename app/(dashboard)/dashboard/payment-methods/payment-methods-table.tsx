"use client";

import { togglePaymentMethodStatus } from "@/actions/payment-method-actions";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { PaymentMethodFilterParams } from "@/lib/filters/payment-method-filters";
import { payment_method } from "@/lib/generated/prisma/client";
import { CRUD } from "@/lib/types";
import { useState, useTransition } from "react";
import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";

const PROVIDER_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  cash_on_delivery: {
    label: "Cash on Delivery",
    icon: "💵",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/50",
  },
  stripe: {
    label: "Stripe",
    icon: "💳",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-900/50",
  },
  paypal: {
    label: "PayPal",
    icon: "🅿️",
    color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/50",
  },
  square: {
    label: "Square",
    icon: "⬛",
    color: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  },
  razorpay: {
    label: "Razorpay",
    icon: "⚡",
    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900/50",
  },
};

interface PaymentMethodsTableProps {
  paymentMethods: payment_method[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: PaymentMethodFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
}

export default function PaymentMethodsTable({
  paymentMethods,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount,
}: PaymentMethodsTableProps) {
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [isTransitionPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleToggleStatus = (id: number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setPendingId(id);
    startTransition(async () => {
      const response = await togglePaymentMethodStatus(id, newStatus);
      setPendingId(null);
      if (!response.success) {
        toast(response.message ?? "Failed to update payment method status", "error");
        return;
      }
      toast(response.message ?? `Payment method ${newStatus ? "enabled" : "disabled"}`, "success");
    });
  };

  const columns: ColumnDef<payment_method>[] = [
    {
      header: "Name & Description",
      render: (method) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-zinc-900 dark:text-zinc-50">{method.name}</span>
          {method.description && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal line-clamp-1">
              {method.description}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Provider",
      render: (method) => {
        const info = PROVIDER_LABELS[method.provider] ?? {
          label: method.provider,
          icon: "💲",
          color: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
        };
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${info.color}`}
          >
            <span>{info.icon}</span>
            {info.label}
          </span>
        );
      },
    },
    {
      header: "Extra Charge",
      render: (method) =>
        method.extra_charge != null ? (
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            ${Number(method.extra_charge).toFixed(2)}
          </span>
        ) : (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
        ),
    },
    {
      header: "Status",
      render: (method) => {
        const isPending = pendingId === method.id && isTransitionPending;
        return (
          <div className="flex items-center gap-3">
            {permissions.update ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleToggleStatus(method.id, method.is_active)}
                className="group flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={method.is_active ? "Click to disable method" : "Click to enable method"}
              >
                <span
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    method.is_active ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      method.is_active ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </span>
                <span
                  className={`text-xs font-semibold ${
                    method.is_active
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {isPending ? "Updating..." : method.is_active ? "Active" : "Inactive"}
                </span>
              </button>
            ) : (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  method.is_active
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/50"
                    : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                }`}
              >
                {method.is_active ? "Active" : "Inactive"}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "Sort Order",
      render: (method) => (
        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-mono font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
          {method.sort_order}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      title="Payment Methods"
      description="Manage storefront payment options. Payment methods are pre-configured system providers; toggle active status to make them available at checkout."
      filterBar={
        <GlobalFilterBar
          searchKey="name"
          searchPlaceholder="Search payment method name..."
          users={dashboardUsers}
          currentFilters={filterParams as Record<string, string | undefined>}
          customFilters={[
            {
              key: "is_active",
              label: "Status",
              type: "select",
              isPrimary: true,
              options: [
                { label: "Active Only", value: "true" },
                { label: "Inactive Only", value: "false" },
              ],
            },
            {
              key: "provider",
              label: "Provider Slug",
              type: "text",
              isPrimary: true,
              placeholder: "Filter by provider...",
            },
            {
              key: "description",
              label: "Description Contains",
              type: "text",
              placeholder: "Search description...",
            },
          ]}
        />
      }
      permissions={permissions}
      data={paymentMethods}
      totalCount={totalCount}
      columns={columns}
      renderActivity={(method) => (
        <ActivityCell
          createdAt={method.created_at}
          createdBy={method.created_by}
          updatedAt={method.updated_at}
          updatedBy={method.updated_by}
          userNames={userNames}
        />
      )}
      emptyState={{
        title: "No payment methods found",
        description: "All payment methods are pre-configured by system seeding.",
      }}
    />
  );
}

