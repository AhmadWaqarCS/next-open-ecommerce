"use client";

import { useState, useTransition } from "react";
import { CRUD } from "@/lib/types";
import TrashTable, { ColumnDef } from "@/app/(dashboard)/_components/trash-table";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import GlobalFilterBar, { CustomFilterConfig } from "@/app/(dashboard)/_components/global-filter-bar";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import {
  restoreInvoice,
  permanentlyDeleteInvoice,
  bulkRestoreInvoices,
  bulkPermanentlyDeleteInvoices,
} from "@/actions/invoice-actions";

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

interface InvoiceTrashTableProps {
  invoices: TrashedInvoice[];
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
}

export default function InvoiceTrashTable({
  invoices,
  permissions,
  userNames,
  totalCount,
}: InvoiceTrashTableProps) {
  const [selectedRestoreInvoice, setSelectedRestoreInvoice] = useState<TrashedInvoice | null>(null);
  const [selectedDeleteInvoice, setSelectedDeleteInvoice] = useState<TrashedInvoice | null>(null);
  const [isRestorePending, startRestoreTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const handleConfirmRestore = () => {
    if (!selectedRestoreInvoice) return;
    const inv = selectedRestoreInvoice;
    startRestoreTransition(async () => {
      const res = await restoreInvoice(inv.id);
      setSelectedRestoreInvoice(null);
      if (res.success) {
        toast(res.message || "Invoice restored successfully.", "success");
      } else {
        toast(res.message || "Failed to restore invoice.", "error");
      }
    });
  };

  const handleConfirmPermanentlyDelete = () => {
    if (!selectedDeleteInvoice) return;
    const inv = selectedDeleteInvoice;
    startDeleteTransition(async () => {
      const res = await permanentlyDeleteInvoice(inv.id);
      setSelectedDeleteInvoice(null);
      if (res.success) {
        toast(res.message || "Invoice permanently deleted.", "success");
      } else {
        toast(res.message || "Failed to delete invoice permanently.", "error");
      }
    });
  };

  const columns: ColumnDef<TrashedInvoice>[] = [
    {
      header: "Invoice #",
      render: (item) => (
        <span className="font-bold text-zinc-900 dark:text-zinc-100">
          {item.invoice_number}
        </span>
      ),
    },
    {
      header: "Customer Email",
      render: (item) => (
        <span className="text-zinc-600 dark:text-zinc-400">
          {item.customer_email}
        </span>
      ),
    },
    {
      header: "Total",
      render: (item) => (
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          ${item.total.toFixed(2)} {item.currency}
        </span>
      ),
    },
  ];

  const filterConfigs: CustomFilterConfig[] = [
    { key: "invoice_number", label: "Invoice #", type: "text" },
    { key: "customer_email", label: "Customer Email", type: "text" },
  ];

  return (
    <>
      <TrashTable
        title="Invoice Trash"
        description="Restore or permanently delete soft-deleted invoices"
        backHref="/dashboard/invoices"
        backLabel="Back to Invoices"
        filterBar={<GlobalFilterBar customFilters={filterConfigs} />}
        permissions={permissions}
        data={invoices}
        totalCount={totalCount}
        columns={columns}
        renderActivity={(item) => (
          <ActivityCell
            deletedAt={item.deleted_at}
            deletedBy={item.deleted_by}
            userNames={userNames}
            isTrash={true}
          />
        )}
        renderActions={(item) => (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setSelectedRestoreInvoice(item)}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded transition-colors cursor-pointer"
            >
              Restore
            </button>
            <button
              type="button"
              onClick={() => setSelectedDeleteInvoice(item)}
              className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded transition-colors cursor-pointer"
            >
              Delete Permanently
            </button>
          </div>
        )}
        onBulkRestore={async (selectedIds, selectAllScope) => {
          const res = await bulkRestoreInvoices(selectedIds, selectAllScope);
          if (res.success) {
            toast(res.message || "Selected invoices restored.", "success");
          } else {
            toast(res.message || "Failed to restore selected invoices.", "error");
          }
          return { success: res.success, message: res.message };
        }}
        onBulkPermanentlyDelete={async (selectedIds, selectAllScope) => {
          const res = await bulkPermanentlyDeleteInvoices(selectedIds, selectAllScope);
          if (res.success) {
            toast(res.message || "Selected invoices permanently deleted.", "success");
          } else {
            toast(res.message || "Failed to permanently delete selected invoices.", "error");
          }
          return { success: res.success, message: res.message };
        }}
        emptyState={{
          title: "Invoice Trash is empty",
          description: "There are no soft-deleted invoices in the trash.",
        }}
      />

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={!!selectedRestoreInvoice}
        onClose={() => setSelectedRestoreInvoice(null)}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Restore Invoice
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Restore this invoice back to active invoices.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Are you sure you want to restore invoice &quot;
            <span className="font-bold text-zinc-800 dark:text-zinc-100">
              {selectedRestoreInvoice?.invoice_number}
            </span>
            &quot;?
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setSelectedRestoreInvoice(null)}
              className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmRestore}
              disabled={isRestorePending}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isRestorePending ? "Restoring..." : "Yes, Restore"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Permanent Delete Confirmation Modal */}
      <Modal
        isOpen={!!selectedDeleteInvoice}
        onClose={() => setSelectedDeleteInvoice(null)}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 text-rose-600 dark:text-rose-400">
            Permanently Delete Invoice
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            This action cannot be undone. The invoice record will be permanently deleted.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Are you sure you want to permanently delete invoice &quot;
            <span className="font-bold text-zinc-800 dark:text-zinc-100">
              {selectedDeleteInvoice?.invoice_number}
            </span>
            &quot;?
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setSelectedDeleteInvoice(null)}
              className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmPermanentlyDelete}
              disabled={isDeletePending}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isDeletePending ? "Deleting..." : "Yes, Delete Permanently"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
