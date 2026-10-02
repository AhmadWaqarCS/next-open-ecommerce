"use client";

import {
  bulkDeleteUsers,
  deleteUser,
  toggleUserStatus,
} from "@/actions/user-actions";
import { CRUD, user } from "@/lib/types";
import { useState, useTransition } from "react";
import { useToast } from "../../_components/toast-context";
import Modal from "../../_components/modal";
import UserFormModal from "./_components/user-form-modal";
import CreateUserForm from "./create-user-form";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
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
      toast(response.message ?? "User moved to trash successfully", "success");
    });
  };

  const columns: ColumnDef<user>[] = [
    {
      header: "Name & Email",
      render: (u) => (
        <div>
          <div className="font-bold text-dashboard-fg">
            {u.name || "N/A"}
          </div>
          <div className="text-xs text-dashboard-muted font-normal">
            {u.email}
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      render: (u) => (
        <span className="font-semibold text-dashboard-muted">
          {u.role_name}
        </span>
      ),
    },
  ];

  return (
    <>
      <DataTable<user>
        title="Users Management"
        description="Create administrative accounts, set role levels, and update active statuses."
        viewTrashHref="/dashboard/users/trash"
        permissions={permissions}
        data={users}
        columns={columns}
        createButton={
          <CreateUserForm roles={roles} permissions={permissions} />
        }
        filterConfig={{
          searchKey: "name",
          searchPlaceholder: "Search user name or email...",
          users: dashboardUsers,
          currentFilters: filterParams as Record<string, string | undefined>,
          customFilters: [
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
          ],
        }}
        paginationConfig={{
          totalItems: totalCount ?? users.length,
          itemName: "users",
        }}
        statusConfig={{
          statusKey: "is_active",
          onToggleStatus: async (item, newStatus) => {
            if (item.role_name === "superadmin" && !newStatus) {
              return {
                success: false,
                message: "Superadmin account must remain active.",
              };
            }
            return await toggleUserStatus(item.id, newStatus);
          },
        }}
        activityConfig={{ userNames }}
        actionConfig={{
          onEdit: (u) => setSelectedUpdateUser(u),
          renderActions: (u) => {
            const canEdit =
              permissions.update &&
              (u.role_name !== "superadmin" ||
                currentUser.role === "superadmin");
            const canDelete =
              permissions.delete &&
              u.role_name !== "superadmin" &&
              u.id !== Number(currentUser.id);

            return (
              <div className="flex items-center justify-end gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setSelectedUpdateUser(u)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-dashboard-border bg-dashboard-card hover:bg-dashboard-card-hover text-dashboard-fg transition-colors cursor-pointer"
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
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setSelectedDeleteUser(u)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-dashboard-danger/30 bg-dashboard-card hover:bg-dashboard-danger-subtle text-dashboard-danger transition-colors cursor-pointer"
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
            );
          },
        }}
        bulkConfig={{
          onBulkDelete: (ids, selectAllScope) =>
            bulkDeleteUsers(ids, selectAllScope, filterParams),
        }}
        emptyState={{
          title: "No users registered",
          description:
            "There are no administrative users found. Click the button below to add your first user.",
          action: <CreateUserForm roles={roles} permissions={permissions} />,
        }}
      />

      {/* User Form Modal for Editing */}
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
          <h3 className="text-lg font-bold text-dashboard-danger flex items-center gap-2">
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
          <p className="text-sm text-dashboard-muted mt-2 leading-relaxed">
            Are you sure you want to deactivate and soft-delete user{" "}
            <span className="font-semibold text-dashboard-fg">
              {selectedDeleteUser?.email}
            </span>
            ? This will temporarily revoke all dashboard privileges. You can
            restore this user from the trash folder.
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-dashboard-border">
          <button
            type="button"
            onClick={() => setSelectedDeleteUser(null)}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-dashboard-border hover:bg-dashboard-card-hover text-dashboard-fg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleDeleteUser(selectedDeleteUser?.id!)}
            disabled={isDeletePending}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-dashboard-danger hover:bg-dashboard-danger-hover text-dashboard-danger-fg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isDeletePending ? "Deactivating..." : "Deactivate"}
          </button>
        </div>
      </Modal>
    </>
  );
}
