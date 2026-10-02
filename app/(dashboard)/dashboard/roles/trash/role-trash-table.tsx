"use client";

import {
  bulkPermanentlyDeleteRoles,
  bulkRestoreRoles,
  permanentlyDeleteRole,
  restoreRole,
} from "@/actions/role-actions";
import { CRUD, role } from "@/lib/types";
import TrashTable, { ColumnDef } from "@/app/(dashboard)/_components/trash-table";
import { RoleFilterParams } from "@/lib/filters/role-filters";

interface RoleTrashTableProps {
  roles: (role & { _count?: { users: number } })[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: RoleFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
}

export default function RoleTrashTable({
  roles,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount,
  currentPage = 1,
  pageSize = 10,
}: RoleTrashTableProps) {
  const columns: ColumnDef<role & { _count?: { users: number } }>[] = [
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
    {
      header: "Status",
      render: (r) =>
        r.is_active ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent-subtle">
            Active
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-dashboard-muted-bg text-dashboard-muted border border-dashboard-border">
            Inactive
          </span>
        ),
    },
  ];

  return (
    <TrashTable<role & { _count?: { users: number } }>
      title="Roles Trash Bin"
      description="Permanently delete or restore soft-deleted dashboard roles."
      backHref="/dashboard/roles"
      backLabel="Back to Roles"
      permissions={permissions}
      data={roles}
      columns={columns}
      filterConfig={{
        searchKey: "name",
        searchPlaceholder: "Search trashed roles...",
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
        itemName: "trashed roles",
      }}
      activityConfig={{
        userNames,
        showAuditDates: true,
      }}
      actionConfig={{
        onRestore: async (item) => {
          return await restoreRole(item.id);
        },
        onPermanentlyDelete: async (item) => {
          return await permanentlyDeleteRole(item.id);
        },
        restoreConfirmMessage: (item) =>
          `Are you sure you want to restore role "${item.name}"? This will re-enable permission controls for users assigned to this role.`,
        deleteConfirmMessage: (item) =>
          `Are you sure you want to permanently delete role "${item.name}"? This action cannot be undone.`,
      }}
      bulkConfig={{
        onBulkRestore: (ids, selectAllScope) =>
          bulkRestoreRoles(ids, selectAllScope, filterParams),
        onBulkPermanentlyDelete: (ids, selectAllScope) =>
          bulkPermanentlyDeleteRoles(ids, selectAllScope, filterParams),
      }}
      emptyState={{
        title: "No deleted roles found",
        description: "No archived roles match your search or filter criteria.",
      }}
    />
  );
}
