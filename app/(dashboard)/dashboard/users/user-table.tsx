"use client";

import { bulkDeleteUsers, deleteUser } from "@/actions/user-actions";
import { CRUD, user } from "@/lib/types";
import { useState, useTransition } from "react";
import { useToast } from "../../_components/toast-context";
import Modal from "../../_components/modal";
import UserFormModal from "./_components/user-form-modal";
import CreateUserForm from "./create-user-form";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";

import GlobalFilterBar, { CustomFilterConfig } from "@/app/(dashboard)/_components/global-filter-bar";
import { UserFilterParams } from "@/lib/filters/user-filters";

interface UserTableProps {
  users: user[];
  roles: { id: number; name: string }[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: UserFilterParams;
  permissions: CRUD;
  currentUser: {
    id: string;
    email?: string | null;
    role: string;
  };
  userNames: Record<number, string>;
  totalCount?: number;
}

export default function UserTable({
  users,
  roles,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  currentUser,
  userNames,
  totalCount,
}: UserTableProps) {
  const [selectedUpdateUser, setSelectedUpdateUser] = useState<user | null>(
    null,
  );
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [selectedDeleteUser, setSelectedDeleteUser] = useState<user | null>(
    null,
  );
  const { toast } = useToast();

  const handleDeleteUser = (id: number) => {
    startDeleteTransition(async () => {
      const response = await deleteUser(id);
      if (!response.success) {
        toast(response.message ?? "Failed to delete user", "error");
        return;
      }
      setSelectedDeleteUser(null);
      toast(response.message ?? "User deleted successfully", "success");
    });
  };

  const columns: ColumnDef<user>[] = [
    {
      header: "Name & Email",
      render: (u) => (
        <div>
          <div className="font-bold text-zinc-900 dark:text-zinc-50">
            {u.name || "N/A"}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
            {u.email}
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      render: (u) => (
        <span className="font-semibold text-zinc-600 dark:text-zinc-400">
          {u.role_name}
        </span>
      ),
    },
    {
      header: "Status",
      render: (u) =>
        u.is_active ? (
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
      <DataTable
        title="Users Management"
        description="Create administrative accounts, set role levels, and update active statuses."
        viewTrashHref="/dashboard/users/trash"
        filterBar={
          <GlobalFilterBar
            searchKey="name"
            searchPlaceholder="Search user name or email..."
            users={dashboardUsers}
            currentFilters={filterParams as Record<string, string | undefined>}
            customFilters={[
              {
                key: "role_name",
                label: "Role",
                type: "select",
                isPrimary: true,
                options: roles.map((r) => ({ label: r.name, value: r.name })),
              },
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
            ]}
          />
        }
        createButton={
          <CreateUserForm roles={roles} permissions={permissions} />
        }
        permissions={permissions}
        data={users}
        totalCount={totalCount}
        columns={columns}
        renderActivity={(u) => (
          <ActivityCell
            createdBy={u.created_by}
            updatedBy={u.updated_by}
            userNames={userNames}
          />
        )}
        renderActions={(u) => (
          <div className="flex items-center justify-end gap-2">
            {permissions.update &&
              (u.role_name !== "superadmin" ||
                currentUser.role === "superadmin") && (
                <button
                  onClick={() => setSelectedUpdateUser(u)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 hover:text-zinc-900 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
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
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  <span>Edit</span>
                </button>
              )}
            {permissions.delete && u.role_name !== "superadmin" && (
              <button
                onClick={() => setSelectedDeleteUser(u)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 bg-white hover:bg-red-50 hover:text-red-750 text-red-600 dark:border-red-900/30 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-955/20 transition-colors cursor-pointer"
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
        onBulkDelete={(ids, selectAllScope) =>
          bulkDeleteUsers(ids, selectAllScope, filterParams)
        }
        emptyState={{
          title: "No users registered",
          description:
            "There are no administrative users found. Click the button below to add your first user.",
          action: <CreateUserForm roles={roles} permissions={permissions} />,
        }}
      />

      {/* Converged User Form Modal for Editing */}
      <UserFormModal
        isOpen={!!selectedUpdateUser}
        onClose={() => setSelectedUpdateUser(null)}
        initialData={selectedUpdateUser}
        roles={roles}
        currentUser={currentUser}
      />

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={!!selectedDeleteUser}
        onClose={() => setSelectedDeleteUser(null)}
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
            <span>Deactivate User</span>
          </h3>
          <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2 leading-relaxed">
            Are you sure you want to deactivate and soft-delete user{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {selectedDeleteUser?.email}
            </span>
            ? This will temporarily revoke all dashboard privileges. You can
            restore this user from the trash folder.
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-zinc-150 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setSelectedDeleteUser(null)}
            className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleDeleteUser(selectedDeleteUser?.id!)}
            disabled={isDeletePending}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-650 hover:bg-red-700 text-white shadow-lg shadow-red-500/10 transition-colors disabled:opacity-50"
          >
            {isDeletePending ? "Deactivating..." : "Deactivate"}
          </button>
        </div>
      </Modal>
    </>
  );
}
