"use client";

import {
  bulkDeletePaymentMethods,
  deletePaymentMethod,
} from "@/actions/payment-method-actions";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { PaymentMethodFilterParams } from "@/lib/filters/payment-method-filters";
import { payment_method } from "@/lib/generated/prisma/client";
import { CRUD } from "@/lib/types";
import Link from "next/link";
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
  const [selectedDeleteMethod, setSelectedDeleteMethod] = useState<payment_method | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const handleDeleteMethod = (id: number) => {
    startDeleteTransition(async () => {
      const response = await deletePaymentMethod(id);
      if (!response.success) {
        toast(response.message ?? "Failed to delete payment method", "error");
        return;
      }
      setSelectedDeleteMethod(null);
      toast(response.message ?? "Payment method moved to trash", "success");
    });
  };

  const columns: ColumnDef<payment_method>[] = [
    {
      header: "Name & Description",
      render: (method) =>
        permissions.update ? (
          <Link
            href={`/dashboard/payment-methods/${method.id}/edit`}
            className="group/item flex flex-col gap-0.5 cursor-pointer"
          >
            <span className="font-bold text-zinc-900 dark:text-zinc-50 group-hover/item:text-violet-600 dark:group-hover/item:text-violet-400 transition-colors">
              {method.name}
            </span>
            {method.description && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal line-clamp-1">
                {method.description}
              </span>
            )}
          </Link>
        ) : (
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
      render: (method) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
            method.is_active
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/50"
              : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
          }`}
        >
          {method.is_active ? "Active" : "Inactive"}
        </span>
      ),
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

  const handleBulkDelete = async (selectedIds: number[], selectAllScope: boolean) => {
    return await bulkDeletePaymentMethods(selectedIds, selectAllScope, filterParams);
  };

  return (
    <>
      <DataTable
        title="Payment Methods"
        description="Manage storefront payment options. Payment methods are pre-configured; enable methods to make them available at checkout."
        viewTrashHref="/dashboard/payment-methods/trash"
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
        renderActions={(method) => (
          <div className="flex items-center justify-end gap-2">
            {permissions.update && (
              <Link
                href={`/dashboard/payment-methods/${method.id}/edit`}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Edit Payment Method"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </Link>
            )}
            {permissions.delete && (
              <button
                onClick={() => setSelectedDeleteMethod(method)}
                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Move to Trash"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
        onBulkDelete={handleBulkDelete}
        emptyState={{
          title: "No payment methods found",
          description: "All payment methods are pre-configured by system seeding.",
        }}
      />

      {/* Delete Confirmation Modal */}
      {selectedDeleteMethod && (
        <Modal
          isOpen={Boolean(selectedDeleteMethod)}
          onClose={() => setSelectedDeleteMethod(null)}
        >
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Move Payment Method to Trash
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to move &quot;
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">
                {selectedDeleteMethod.name}
              </strong>
              &quot; to trash? You can restore it later from the trash page.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDeleteMethod(null)}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletePending}
                onClick={() => handleDeleteMethod(selectedDeleteMethod.id)}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeletePending ? "Moving to Trash..." : "Move to Trash"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
