"use client";

import { bulkDeleteRoles, deleteRole, updateRolePermissions } from "@/actions/role-actions";
import { CRUD, roleWithPermissions, siteFeature } from "@/lib/types";
import { useEffect, useState, useTransition } from "react";
import { useToast } from "../../_components/toast-context";
import Modal from "../../_components/modal";
import RoleFormModal from "./_components/role-form-modal";
import CreateRoleForm from "./create-role-form";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";

import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";
import { RoleFilterParams } from "@/lib/filters/role-filters";

interface RoleTableProps {
  roles: roleWithPermissions[];
  siteFeatures: siteFeature[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: RoleFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
}

type PermissionState = Record<
  number,
  { create: boolean; read: boolean; update: boolean; delete: boolean }
>;

export default function RoleTable({
  roles,
  siteFeatures,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount,
}: RoleTableProps) {
  const [selectedUpdateRole, setSelectedUpdateRole] =
    useState<roleWithPermissions | null>(null);
  const [selectedDeleteRole, setSelectedDeleteRole] =
    useState<roleWithPermissions | null>(null);
  const [selectedPermissionsRole, setSelectedPermissionsRole] =
    useState<roleWithPermissions | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>({});

  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isPermPending, startPermTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedPermissionsRole) {
      const initial: PermissionState = {};
      siteFeatures.forEach((f) => {
        const existing = selectedPermissionsRole.site_feature_roles.find(
          (sfr) => sfr.site_feature_id === f.id,
        );
        initial[f.id] = existing?.access_crud ?? {
          create: false,
          read: false,
          update: false,
          delete: false,
        };
      });
      setPermissionState(initial);
    }
  }, [selectedPermissionsRole, siteFeatures]);

  const handleDeleteRole = (id: number) => {
    startDeleteTransition(async () => {
      const response = await deleteRole(id);
      if (!response.success) {
        toast(response.message ?? "Failed to delete role", "error");
        return;
      }
      setSelectedDeleteRole(null);
      toast(response.message ?? "Role deleted successfully", "success");
    });
  };

  const handleSavePermissions = () => {
    startPermTransition(async () => {
      const permsArray = Object.entries(permissionState).map(
        ([feature_id, crud]) => ({
          site_feature_id: Number(feature_id),
          access_crud: crud,
        }),
      );
      const response = await updateRolePermissions(
        selectedPermissionsRole!.id,
        permsArray,
      );
      if (!response.success) {
        toast(response.message ?? "Failed to update permissions", "error");
        return;
      }
      setSelectedPermissionsRole(null);
      toast(response.message ?? "Permissions updated successfully", "success");
    });
  };

  const toggleCrud = (
    featureId: number,
    key: keyof CRUD,
    value: boolean,
  ) => {
    setPermissionState((prev) => ({
      ...prev,
      [featureId]: { ...prev[featureId], [key]: value },
    }));
  };

  const columns: ColumnDef<roleWithPermissions>[] = [
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
      <DataTable
        title="Roles Management"
        description="Configure access roles, feature matrices, and granular CRUD permissions."
        viewTrashHref="/dashboard/roles/trash"
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
        createButton={<CreateRoleForm permissions={permissions} />}
        permissions={permissions}
        data={roles}
        totalCount={totalCount}
        columns={columns}
        renderActivity={(r) => (
          <ActivityCell
            createdBy={r.created_by}
            updatedBy={r.updated_by}
            userNames={userNames}
          />
        )}
        renderActions={(r) => (
          <div className="flex items-center justify-end gap-2">
            {permissions.update && (
              <button
                onClick={() => setSelectedUpdateRole(r)}
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
            {permissions.update && r.name !== "superadmin" && (
              <button
                onClick={() => setSelectedPermissionsRole(r)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 hover:text-indigo-750 text-indigo-650 dark:border-indigo-900/30 dark:bg-zinc-900 dark:text-indigo-400 dark:hover:bg-indigo-955/20 transition-colors cursor-pointer"
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
            {permissions.delete && r.name !== "superadmin" && (
              <button
                onClick={() => setSelectedDeleteRole(r)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 bg-white hover:bg-red-50 hover:text-red-700 text-red-650 dark:border-red-900/30 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-955/20 transition-colors cursor-pointer"
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
          bulkDeleteRoles(ids, selectAllScope, filterParams)
        }
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

      {/* Delete Role Confirmation Modal */}
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
            <span>Deactivate Role</span>
          </h3>
          <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2 leading-relaxed">
            Are you sure you want to deactivate and soft-delete role &quot;
            {selectedDeleteRole?.name}&quot;? This will immediately disable permissions for all assigned user profiles. You can restore this role later.
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
            onClick={() => handleDeleteRole(selectedDeleteRole?.id!)}
            disabled={isDeletePending}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-650 hover:bg-red-700 text-white shadow-lg shadow-red-500/10 transition-colors disabled:opacity-50"
          >
            {isDeletePending ? "Deactivating..." : "Deactivate Role"}
          </button>
        </div>
      </Modal>

      {/* Permissions Matrix Modal */}
      <Modal
        isOpen={!!selectedPermissionsRole}
        onClose={() => setSelectedPermissionsRole(null)}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Edit Role Permissions: {selectedPermissionsRole?.name}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Toggle feature access levels for users assigned to this role.
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1 my-4">
          <div className="grid grid-cols-5 gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-500 dark:text-zinc-400">
            <div className="col-span-1">Feature</div>
            <div className="text-center">Create</div>
            <div className="text-center">Read</div>
            <div className="text-center">Update</div>
            <div className="text-center">Delete</div>
          </div>

          {siteFeatures.map((feat) => {
            const currentCrud = permissionState[feat.id] ?? {
              create: false,
              read: false,
              update: false,
              delete: false,
            };

            return (
              <div
                key={feat.id}
                className="grid grid-cols-5 gap-2 items-center py-2 border-b border-zinc-100 dark:border-zinc-800/60 text-sm"
              >
                <div className="col-span-1 font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                  {feat.name}
                </div>
                {(["create", "read", "update", "delete"] as const).map((key) => (
                  <div key={key} className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={currentCrud[key]}
                      onChange={(e) =>
                        toggleCrud(feat.id, key, e.target.checked)
                      }
                      className="h-4 w-4 rounded-md border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-zinc-150 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setSelectedPermissionsRole(null)}
            className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSavePermissions}
            disabled={isPermPending}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/10 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isPermPending ? "Saving..." : "Save Permissions"}
          </button>
        </div>
      </Modal>
    </>
  );
}
