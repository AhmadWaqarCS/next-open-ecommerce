"use client";

import {
  bulkPermanentlyDeletePaymentMethods,
  bulkRestorePaymentMethods,
  permanentlyDeletePaymentMethod,
  restorePaymentMethod,
} from "@/actions/payment-method-actions";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import TrashTable, { ColumnDef } from "@/app/(dashboard)/_components/trash-table";
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

interface PaymentMethodsTrashTableProps {
  paymentMethods: payment_method[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: PaymentMethodFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
}

export default function PaymentMethodsTrashTable({
  paymentMethods,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount,
}: PaymentMethodsTrashTableProps) {
  const [selectedRestoreMethod, setSelectedRestoreMethod] = useState<payment_method | null>(null);
  const [selectedDeleteMethod, setSelectedDeleteMethod] = useState<payment_method | null>(null);
  const [isRestorePending, startRestoreTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const handleRestoreMethod = (id: number) => {
    startRestoreTransition(async () => {
      const response = await restorePaymentMethod(id);
      if (!response.success) {
        toast(response.message ?? "Failed to restore payment method", "error");
        return;
      }
      toast(response.message ?? "Payment method restored successfully", "success");
      setSelectedRestoreMethod(null);
    });
  };

  const handlePermanentlyDeleteMethod = (id: number) => {
    startDeleteTransition(async () => {
      const response = await permanentlyDeletePaymentMethod(id);
      if (!response.success) {
        toast(response.message ?? "Failed to delete payment method", "error");
        return;
      }
      toast(response.message ?? "Payment method permanently deleted", "success");
      setSelectedDeleteMethod(null);
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
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${info.color}`}>
            <span>{info.icon}</span>
            {info.label}
          </span>
        );
      },
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
  ];

  const handleBulkRestore = async (selectedIds: number[], selectAllScope: boolean) =>
    await bulkRestorePaymentMethods(selectedIds, selectAllScope, filterParams);

  const handleBulkPermanentlyDelete = async (selectedIds: number[], selectAllScope: boolean) =>
    await bulkPermanentlyDeletePaymentMethods(selectedIds, selectAllScope, filterParams);

  return (
    <>
      <TrashTable
        title="Payment Methods Trash"
        description="View, restore, or permanently delete soft-deleted payment methods."
        backHref="/dashboard/payment-methods"
        backLabel="Back to Payment Methods"
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
            deletedAt={method.deleted_at}
            deletedBy={method.deleted_by}
            userNames={userNames}
          />
        )}
        renderActions={(method) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setSelectedRestoreMethod(method)}
              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
              title="Restore Payment Method"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={() => setSelectedDeleteMethod(method)}
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Permanently Delete"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
        onBulkRestore={handleBulkRestore}
        onBulkPermanentlyDelete={handleBulkPermanentlyDelete}
        emptyState={{
          title: "Trash is empty",
          description: "There are currently no deleted payment methods.",
        }}
      />

      {/* Restore Modal */}
      {selectedRestoreMethod && (
        <Modal isOpen={Boolean(selectedRestoreMethod)} onClose={() => setSelectedRestoreMethod(null)}>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Restore Payment Method</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to restore &quot;
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{selectedRestoreMethod.name}</strong>
              &quot;? It will be moved back to the active payment methods list.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRestoreMethod(null)}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRestorePending}
                onClick={() => handleRestoreMethod(selectedRestoreMethod.id)}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isRestorePending ? "Restoring..." : "Restore Payment Method"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Permanent Delete Modal */}
      {selectedDeleteMethod && (
        <Modal isOpen={Boolean(selectedDeleteMethod)} onClose={() => setSelectedDeleteMethod(null)}>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Permanently Delete Payment Method</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to permanently delete &quot;
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{selectedDeleteMethod.name}</strong>
              &quot;? This action cannot be undone.
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
                onClick={() => handlePermanentlyDeleteMethod(selectedDeleteMethod.id)}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeletePending ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
