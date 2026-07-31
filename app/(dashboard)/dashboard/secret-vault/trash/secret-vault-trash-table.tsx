"use client";

import { useState, useTransition } from "react";
import TrashTable, { ColumnDef } from "@/app/(dashboard)/_components/trash-table";
import Modal from "@/app/(dashboard)/_components/modal";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { CRUD } from "@/lib/types";
import { SecretFilterParams } from "@/lib/filters/secret-filters";
import {
  bulkPermanentlyDeleteSecrets,
  bulkRestoreSecrets,
  permanentlyDeleteSecret,
  restoreSecret,
} from "@/actions/secret-actions";
import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";

export interface DeletedSecretItem {
  id: number;
  key_name: string;
  description: string | null;
  deleted_at: Date | string | null;
  deleted_by: number | null;
  created_at: Date | string;
  created_by: number;
  updated_at: Date | string;
  updated_by: number;
}

interface SecretVaultTrashTableProps {
  secrets: DeletedSecretItem[];
  connectedMap: Record<string, string>;
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: SecretFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
}

export default function SecretVaultTrashTable({
  secrets,
  connectedMap,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount,
}: SecretVaultTrashTableProps) {
  const [selectedPermanentDelete, setSelectedPermanentDelete] = useState<DeletedSecretItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleRestore = (id: number) => {
    startTransition(async () => {
      const response = await restoreSecret(id);
      if (!response.success) {
        toast(response.message ?? "Failed to restore secret", "error");
        return;
      }
      toast(response.message ?? "Secret restored successfully", "success");
    });
  };

  const handlePermanentDelete = (id: number) => {
    startTransition(async () => {
      const response = await permanentlyDeleteSecret(id);
      if (!response.success) {
        toast(response.message ?? "Failed to delete secret permanently", "error");
        return;
      }
      setSelectedPermanentDelete(null);
      toast(response.message ?? "Secret permanently deleted", "success");
    });
  };

  const columns: ColumnDef<DeletedSecretItem>[] = [
    {
      header: "Key Name & Description",
      render: (secret) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-50 text-sm">
            {secret.key_name}
          </span>
          {secret.description && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal line-clamp-1">
              {secret.description}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "System Connection",
      render: (secret) => {
        const connection = connectedMap[secret.key_name];
        if (connection) {
          return (
            <span
              title={`Connected to ${connection}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50"
            >
              <span>🔗</span>
              <span>{connection}</span>
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
            <span>🔓</span>
            <span>Standalone</span>
          </span>
        );
      },
    },
  ];

  const handleBulkRestore = async (selectedIds: number[], selectAllScope: boolean) => {
    return await bulkRestoreSecrets(selectedIds, selectAllScope, filterParams);
  };

  const handleBulkPermanentlyDelete = async (selectedIds: number[], selectAllScope: boolean) => {
    return await bulkPermanentlyDeleteSecrets(selectedIds, selectAllScope, filterParams);
  };

  return (
    <>
      <TrashTable
        title="Secret Vault Trash"
        description="View and restore soft-deleted secrets or permanently remove them."
        backHref="/dashboard/secret-vault"
        backLabel="Back to Secret Vault"
        filterBar={
          <GlobalFilterBar
            searchKey="name"
            searchPlaceholder="Search key name or description..."
            users={dashboardUsers}
            currentFilters={filterParams as Record<string, string | undefined>}
          />
        }
        permissions={permissions}
        data={secrets}
        totalCount={totalCount}
        columns={columns}
        renderActivity={(secret) => (
          <ActivityCell
            createdAt={secret.created_at}
            createdBy={secret.created_by}
            updatedAt={secret.updated_at}
            updatedBy={secret.updated_by}
            deletedAt={secret.deleted_at}
            deletedBy={secret.deleted_by}
            userNames={userNames}
          />
        )}
        renderActions={(secret) => {
          const isConnected = Boolean(connectedMap[secret.key_name]);
          return (
            <div className="flex items-center justify-end gap-1.5">
              {/* Restore Button */}
              <button
                onClick={() => handleRestore(secret.id)}
                disabled={isPending}
                className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer disabled:opacity-50"
                title="Restore Secret"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              {/* Permanent Delete Button */}
              <button
                onClick={() => setSelectedPermanentDelete(secret)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isConnected
                    ? "text-zinc-300 dark:text-zinc-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    : "text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                }`}
                title={isConnected ? `Connected to ${connectedMap[secret.key_name]} (Protected)` : "Delete Permanently"}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          );
        }}
        onBulkRestore={handleBulkRestore}
        onBulkPermanentlyDelete={handleBulkPermanentlyDelete}
        emptyState={{
          title: "Trash is empty",
          description: "There are no soft-deleted secrets in the vault.",
        }}
      />

      {/* Permanent Delete Confirmation Modal */}
      {selectedPermanentDelete && (
        <Modal
          isOpen={Boolean(selectedPermanentDelete)}
          onClose={() => setSelectedPermanentDelete(null)}
        >
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <span>⚠️</span>
              <span>Permanently Delete Secret</span>
            </h3>

            {connectedMap[selectedPermanentDelete.key_name] ? (
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider">
                  Connected Secret Protection
                </p>
                <p className="text-sm leading-relaxed">
                  The secret <strong className="font-mono">{selectedPermanentDelete.key_name}</strong> is currently connected to{" "}
                  <strong>{connectedMap[selectedPermanentDelete.key_name]}</strong>.
                </p>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Connected secrets cannot be permanently deleted. Please re-configure or remove the system integration first.
                </p>
              </div>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Are you sure you want to permanently delete secret &quot;
                <strong className="text-zinc-900 dark:text-zinc-100 font-mono font-semibold">
                  {selectedPermanentDelete.key_name}
                </strong>
                &quot;? <strong className="text-rose-600 dark:text-rose-400 font-bold">This action cannot be undone.</strong>
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPermanentDelete(null)}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || Boolean(connectedMap[selectedPermanentDelete.key_name])}
                onClick={() => handlePermanentDelete(selectedPermanentDelete.id)}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isPending ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
