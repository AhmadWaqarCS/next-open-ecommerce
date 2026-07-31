"use client";

import { useState, useTransition } from "react";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import Modal from "@/app/(dashboard)/_components/modal";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { CRUD } from "@/lib/types";
import { SecretFilterParams } from "@/lib/filters/secret-filters";
import { bulkDeleteSecrets, deleteSecret } from "@/actions/secret-actions";
import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";
import SecretFormModal from "./_components/secret-form-modal";

export interface SecretItem {
  id: number;
  key_name: string;
  description: string | null;
  last_rotated: Date | string | null;
  created_at: Date | string;
  created_by: number;
  updated_at: Date | string;
  updated_by: number;
}

interface SecretVaultTableProps {
  secrets: SecretItem[];
  connectedMap: Record<string, string>;
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: SecretFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
}

export default function SecretVaultTable({
  secrets,
  connectedMap,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount,
}: SecretVaultTableProps) {
  const [selectedDeleteSecret, setSelectedDeleteSecret] = useState<SecretItem | null>(null);
  const [editingSecret, setEditingSecret] = useState<SecretItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const handleDeleteSecret = (id: number) => {
    startDeleteTransition(async () => {
      const response = await deleteSecret(id);
      if (!response.success) {
        toast(response.message ?? "Failed to delete secret", "error");
        return;
      }
      setSelectedDeleteSecret(null);
      toast(response.message ?? "Secret moved to trash", "success");
    });
  };

  const columns: ColumnDef<SecretItem>[] = [
    {
      header: "Key Name & Description",
      render: (secret) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-50 text-sm">
              {secret.key_name}
            </span>
          </div>
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50"
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
    {
      header: "Last Rotated",
      render: (secret) => (
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {secret.last_rotated
            ? new Date(secret.last_rotated).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Never"}
        </span>
      ),
    },
  ];

  const handleBulkDelete = async (selectedIds: number[], selectAllScope: boolean) => {
    return await bulkDeleteSecrets(selectedIds, selectAllScope, filterParams);
  };

  return (
    <>
      <DataTable
        title="Secret Vault"
        description="Admin-only registry displaying active secrets present in the database."
        viewTrashHref="/dashboard/secret-vault/trash"
        createButton={
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Secret</span>
          </button>
        }
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
            userNames={userNames}
          />
        )}
        renderActions={(secret) => {
          const isConnected = Boolean(connectedMap[secret.key_name]);
          return (
            <div className="flex items-center justify-end gap-1.5">
              {/* Edit Secret Description */}
              <button
                onClick={() => setEditingSecret(secret)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Edit Description"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              {/* Move to Trash */}
              <button
                onClick={() => setSelectedDeleteSecret(secret)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isConnected
                    ? "text-zinc-300 dark:text-zinc-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    : "text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                }`}
                title={isConnected ? `Connected to ${connectedMap[secret.key_name]} (Protected)` : "Move to Trash"}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          );
        }}
        onBulkDelete={handleBulkDelete}
        emptyState={{
          title: "No secrets found in vault",
          description: "There are currently no secret keys registered in the database.",
          action: (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Secret</span>
            </button>
          ),
        }}
      />

      {/* Create / Edit Form Modal */}
      <SecretFormModal
        isOpen={showCreateModal || Boolean(editingSecret)}
        onClose={() => {
          setShowCreateModal(false);
          setEditingSecret(null);
        }}
        initialData={editingSecret}
      />

      {/* Delete Confirmation Modal Dialog */}
      {selectedDeleteSecret && (
        <Modal
          isOpen={Boolean(selectedDeleteSecret)}
          onClose={() => setSelectedDeleteSecret(null)}
        >
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>⚠️</span>
              <span>Move Secret to Trash</span>
            </h3>

            {connectedMap[selectedDeleteSecret.key_name] ? (
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider">
                  Connected Secret Protection
                </p>
                <p className="text-sm leading-relaxed">
                  The secret <strong className="font-mono">{selectedDeleteSecret.key_name}</strong> is currently connected to{" "}
                  <strong>{connectedMap[selectedDeleteSecret.key_name]}</strong>.
                </p>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Connected secrets cannot be deleted under any circumstances to prevent service disruption. Please remove or update the system integration first before attempting to delete this secret.
                </p>
              </div>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Are you sure you want to move secret &quot;
                <strong className="text-zinc-900 dark:text-zinc-100 font-mono font-semibold">
                  {selectedDeleteSecret.key_name}
                </strong>
                &quot; to trash? You can restore it later from the trash page.
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDeleteSecret(null)}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeletePending || Boolean(connectedMap[selectedDeleteSecret.key_name])}
                onClick={() => handleDeleteSecret(selectedDeleteSecret.id)}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
