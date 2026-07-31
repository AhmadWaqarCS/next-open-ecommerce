"use client";

import {
  bulkPermanentlyDeleteRoles,
  bulkRestoreRoles,
  permanentlyDeleteRole,
  restoreRole,
} from "@/actions/role-actions";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { CRUD, role } from "@/lib/types";
import { useState, useTransition } from "react";
import TrashTable, { ColumnDef } from "@/app/(dashboard)/_components/trash-table";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";
import { RoleFilterParams } from "@/lib/filters/role-filters";

interface RoleTrashTableProps {
  roles: role[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: RoleFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
}

export default function RoleTrashTable({
  roles,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount,
}: RoleTrashTableProps) {
  const [selectedRestoreRole, setSelectedRestoreRole] = useState<role | null>(
    null,
  );
  const [selectedDeleteRole, setSelectedDeleteRole] = useState<role | null>(
    null,
  );
  const [isRestorePending, startRestoreTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const handleRestoreRole = (id: number) => {
    startRestoreTransition(async () => {
      const response = await restoreRole(id);
      if (!response.success) {
        toast(response.message ?? "Failed to restore role", "error");
        return;
      }
      toast(response.message ?? "Role restored successfully", "success");
      setSelectedRestoreRole(null);
    });
  };

  const handlePermanentlyDeleteRole = (id: number) => {
    startDeleteTransition(async () => {
      const response = await permanentlyDeleteRole(id);
      if (!response.success) {
        toast(response.message ?? "Failed to delete role", "error");
        return;
      }
      toast(response.message ?? "Role permanently deleted", "success");
      setSelectedDeleteRole(null);
    });
  };

  const columns: ColumnDef<role>[] = [
    {
      header: "Role Name",
      render: (r) => (
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          {r.name}
        </span>
      ),
    },
    {
      header: "Status",
      render: (r) =>
        r.is_active ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/30">
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-50 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
            Inactive
          </span>
        ),
    },
  ];

  return (
    <>
      <TrashTable
        title="Roles Trash Bin"
        description="Permanently delete or restore soft-deleted dashboard roles."
        backHref="/dashboard/roles"
        backLabel="Back to Roles"
        filterBar={
          <GlobalFilterBar
            searchKey="name"
            searchPlaceholder="Search role name..."
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
                key: "is_system",
                label: "Role Type",
                type: "select",
                isPrimary: true,
                options: [
                  { label: "System Roles", value: "true" },
                  { label: "Custom Roles", value: "false" },
                ],
              },
              {
                key: "min_users",
                label: "Min Users Assigned",
                type: "number",
                placeholder: "e.g. 1",
              },
              {
                key: "max_users",
                label: "Max Users Assigned",
                type: "number",
                placeholder: "e.g. 10",
              },
            ]}
          />
        }
        permissions={permissions}
        data={roles}
        totalCount={totalCount}
        columns={columns}
        renderActivity={(r) => (
          <ActivityCell
            deletedBy={r.deleted_by}
            deletedAt={r.deleted_at}
            userNames={userNames}
            isTrash={true}
          />
        )}
        renderActions={(r) => (
          <div className="flex items-center justify-end gap-2">
            {permissions.delete && (
              <button
                onClick={() => setSelectedRestoreRole(r)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 hover:text-indigo-750 text-indigo-600 dark:border-indigo-900/30 dark:bg-zinc-900 dark:text-indigo-450 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6H16"
                  />
                </svg>
                <span>Restore</span>
              </button>
            )}
            {permissions.delete && (
              <button
                onClick={() => setSelectedDeleteRole(r)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 bg-white hover:bg-red-50 hover:text-red-750 text-red-600 dark:border-red-900/30 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
        onBulkRestore={(ids, selectAllScope) =>
          bulkRestoreRoles(ids, selectAllScope, filterParams)
        }
        onBulkPermanentlyDelete={(ids, selectAllScope) =>
          bulkPermanentlyDeleteRoles(ids, selectAllScope, filterParams)
        }
        emptyState={{
          title: "No deleted roles found",
          description: "No archived roles match your search or filter criteria.",
        }}
      />

      {/* Restore Role Modal */}
      <Modal
        isOpen={!!selectedRestoreRole}
        onClose={() => setSelectedRestoreRole(null)}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Restore Role Settings
          </h3>
          <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2 leading-relaxed">
            Are you sure you want to restore role{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              &quot;{selectedRestoreRole?.name}&quot;
            </span>
            ? This will re-enable permission controls for users assigned to this role.
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-zinc-150 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setSelectedRestoreRole(null)}
            className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleRestoreRole(selectedRestoreRole!.id)}
            disabled={isRestorePending}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/10 transition-colors disabled:opacity-50"
          >
            {isRestorePending ? "Restoring..." : "Restore Role"}
          </button>
        </div>
      </Modal>

      {/* Permanent Delete Modal */}
      <Modal
        isOpen={!!selectedDeleteRole}
        onClose={() => setSelectedDeleteRole(null)}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>Permanently Delete Role</span>
          </h3>
          <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2 leading-relaxed">
            Are you sure you want to permanently delete role{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              &quot;{selectedDeleteRole?.name}&quot;
            </span>
            ? This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-zinc-150 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setSelectedDeleteRole(null)}
            className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handlePermanentlyDeleteRole(selectedDeleteRole!.id)}
            disabled={isDeletePending}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-650 hover:bg-red-700 text-white shadow-lg shadow-red-500/10 transition-colors disabled:opacity-50"
          >
            {isDeletePending ? "Deleting..." : "Permanently Delete"}
          </button>
        </div>
      </Modal>
    </>
  );
}
