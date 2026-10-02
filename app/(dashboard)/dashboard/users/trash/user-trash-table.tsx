"use client";

import {
  bulkPermanentlyDeleteUsers,
  bulkRestoreUsers,
  permanentlyDeleteUser,
  restoreUser,
} from "@/actions/user-actions";
import { CRUD, user } from "@/lib/types";
import TrashTable, {
  ColumnDef,
} from "@/app/(dashboard)/_components/trash-table";
import { UserFilterParams } from "@/lib/filters/user-filters";

interface UserTrashProps {
  users: user[];
  roles?: { id: number; name: string }[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: UserFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
}

export default function UserTrashTable({
  users,
  roles = [],
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount,
}: UserTrashProps) {
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
    {
      header: "Status",
      render: (u) =>
        u.is_active ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent/30">
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-dashboard-muted-bg text-dashboard-muted border border-dashboard-border">
            Inactive
          </span>
        ),
    },
  ];

  return (
    <TrashTable<user>
      title="Users Trash Bin"
      description="Permanently delete or restore soft-deleted administrative user accounts."
      backHref="/dashboard/users"
      backLabel="Back to Users"
      permissions={permissions}
      data={users}
      columns={columns}
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
        itemName: "trashed users",
      }}
      activityConfig={{ userNames, showAuditDates: true }}
      actionConfig={{
        onRestore: async (u) => {
          return await restoreUser(u.id);
        },
        onPermanentlyDelete: async (u) => {
          return await permanentlyDeleteUser(u.id);
        },
        restoreConfirmMessage: (u) =>
          `Are you sure you want to restore user account ${u.email}? This will re-enable their dashboard privileges and active permissions.`,
        deleteConfirmMessage: (u) =>
          `Are you sure you want to permanently delete user account ${u.email}? This action cannot be undone.`,
      }}
      bulkConfig={{
        onBulkRestore: (ids, selectAllScope) =>
          bulkRestoreUsers(ids, selectAllScope, filterParams),
        onBulkPermanentlyDelete: (ids, selectAllScope) =>
          bulkPermanentlyDeleteUsers(ids, selectAllScope, filterParams),
      }}
      emptyState={{
        title: "No deleted users found",
        description: "No archived users match your search or filter criteria.",
      }}
    />
  );
}
