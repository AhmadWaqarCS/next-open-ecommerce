"use client";

import { useState, useTransition } from "react";
import { bulkDeleteRoles, deleteRole, toggleRoleStatus } from "@/actions/role-actions";
import { CRUD, roleWithPermissions, siteFeature } from "@/lib/types";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import Modal from "@/app/(dashboard)/_components/modal";
import RoleFormModal from "./_components/role-form-modal";
import RolePermissionsModal from "./_components/role-permissions-modal";
import CreateRoleForm from "./create-role-form";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import { RoleFilterParams } from "@/lib/filters/role-filters";

interface RoleTableProps {
  roles: roleWithPermissions[];
  siteFeatures: siteFeature[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: RoleFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
}

export default function RoleTable({
  roles,
  siteFeatures,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount,
  currentPage = 1,
  pageSize = 10,
}: RoleTableProps) {
  const [selectedUpdateRole, setSelectedUpdateRole] =
    useState<roleWithPermissions | null>(null);
  const [selectedDeleteRole, setSelectedDeleteRole] =
    useState<roleWithPermissions | null>(null);
  const [selectedPermissionsRole, setSelectedPermissionsRole] =
    useState<roleWithPermissions | null>(null);

  const [isDeletePending, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const handleDeleteRole = (id: number) => {
    startDeleteTransition(async () => {
      const response = await deleteRole(id);
      if (!response.success) {
        toast.error(response.message ?? "Failed to delete role.");
        return;
      }
      setSelectedDeleteRole(null);
      toast.success(response.message ?? "Role moved to trash successfully.");
    });
  };

  const columns: ColumnDef<roleWithPermissions>[] = [
    {
      header: "Role Details",
      render: (r) => {
        const isSuperadmin = r.name.toLowerCase() === "superadmin";
        const userCount = r._count?.users ?? 0;

        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-dashboard-fg">
                {r.name}
              </span>
              {isSuperadmin && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent-subtle">
                  System
                </span>
              )}
            </div>
            <div className="text-xs text-dashboard-muted font-normal mt-0.5">
              {userCount} assigned {userCount === 1 ? "user" : "users"}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable<roleWithPermissions>
        title="Roles Management"
        description="Configure administrative roles, site feature matrices, and granular CRUD permissions."
        viewTrashHref="/dashboard/roles/trash"
        createButton={<CreateRoleForm permissions={permissions} />}
        permissions={permissions}
        data={roles}
        columns={columns}
        filterConfig={{
          searchKey: "name",
          searchPlaceholder: "Search role name...",
          users: dashboardUsers,
          currentFilters: filterParams as Record<string, string | undefined>,
          customFilters: [
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
          ],
        }}
        paginationConfig={{
          totalItems: totalCount ?? roles.length,
          currentPage,
          pageSize,
          itemName: "roles",
        }}
        statusConfig={{
          statusKey: "is_active",
          onToggleStatus: async (item, newStatus) => {
            if (item.name.toLowerCase() === "superadmin" && !newStatus) {
              return {
                success: false,
                message: "Superadmin role must remain active.",
              };
            }
            return await toggleRoleStatus(item.id, newStatus);
          },
        }}
        activityConfig={{ userNames }}
        actionConfig={{
          onEdit: (r) => setSelectedUpdateRole(r),
          renderActions: (r) => {
            const isSuperadmin = r.name.toLowerCase() === "superadmin";

            return (
              <div className="flex items-center justify-end gap-2">
                {permissions.update && (
                  <button
                    type="button"
                    onClick={() => setSelectedUpdateRole(r)}
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

                {permissions.update && !isSuperadmin && (
                  <button
                    type="button"
                    onClick={() => setSelectedPermissionsRole(r)}
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
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <span>Permissions</span>
                  </button>
                )}

                {permissions.delete && !isSuperadmin && (
                  <button
                    type="button"
                    onClick={() => setSelectedDeleteRole(r)}
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
            bulkDeleteRoles(ids, selectAllScope, filterParams),
        }}
        emptyState={{
          title: "No roles created",
          description: "There are no roles available. Add a role to get started.",
          action: <CreateRoleForm permissions={permissions} />,
        }}
      />

      {/* Converged Role Form Modal for Editing */}
      <RoleFormModal
        isOpen={!!selectedUpdateRole}
        onClose={() => setSelectedUpdateRole(null)}
        initialData={selectedUpdateRole}
      />

      {/* Permissions Matrix Modal */}
      <RolePermissionsModal
        isOpen={!!selectedPermissionsRole}
        onClose={() => setSelectedPermissionsRole(null)}
        role={selectedPermissionsRole}
        siteFeatures={siteFeatures}
      />

      {/* Delete Role Confirmation Modal */}
      <Modal
        isOpen={!!selectedDeleteRole}
        onClose={() => setSelectedDeleteRole(null)}
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
            <span>Deactivate & Move to Trash</span>
          </h3>
          <p className="text-sm text-dashboard-muted mt-2 leading-relaxed">
            Are you sure you want to deactivate and soft-delete role{" "}
            <span className="font-semibold text-dashboard-fg">
              &quot;{selectedDeleteRole?.name}&quot;
            </span>
            ? This will immediately revoke feature access for all assigned user profiles. You can restore this role from the trash folder.
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-dashboard-border">
          <button
            type="button"
            onClick={() => setSelectedDeleteRole(null)}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-dashboard-border hover:bg-dashboard-card-hover text-dashboard-fg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleDeleteRole(selectedDeleteRole?.id!)}
            disabled={isDeletePending}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-dashboard-danger hover:bg-dashboard-danger-hover text-dashboard-danger-fg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isDeletePending ? "Deactivating..." : "Deactivate Role"}
          </button>
        </div>
      </Modal>
    </>
  );
}
