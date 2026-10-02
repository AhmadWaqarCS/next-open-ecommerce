"use client";

import { togglePaymentMethodStatus } from "@/actions/payment-method-actions";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { PaymentMethodFilterParams } from "@/lib/filters/payment-method-filters";
import { CRUD } from "@/lib/types";
import { useState } from "react";
import PaymentMethodModal, {
  PROVIDER_LABELS,
  SerializedPaymentMethod,
} from "./_components/payment-method-modal";

interface PaymentMethodsTableProps {
  paymentMethods: SerializedPaymentMethod[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: PaymentMethodFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
}

export default function PaymentMethodsTable({
  paymentMethods,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount = 0,
  currentPage = 1,
  pageSize = 10,
}: PaymentMethodsTableProps) {
  const [editingMethod, setEditingMethod] =
    useState<SerializedPaymentMethod | null>(null);
  const { toast } = useToast();

  const columns: ColumnDef<SerializedPaymentMethod>[] = [
    {
      header: "Name & Description",
      render: (method) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-dashboard-fg">{method.name}</span>
          {method.description && (
            <span className="text-xs text-dashboard-muted font-normal line-clamp-1">
              {method.description}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Provider",
      render: (method) => {
        const info = PROVIDER_LABELS[method.provider] ?? {
          label: method.provider,
          icon: "💲",
          color:
            "bg-dashboard-muted-bg text-dashboard-fg border-dashboard-border",
        };
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${info.color}`}
          >
            <span>{info.icon}</span>
            {info.label}
          </span>
        );
      },
    },
    {
      header: "Extra Charge",
      render: (method) =>
        method.extra_charge != null && Number(method.extra_charge) > 0 ? (
          <span className="text-sm font-semibold text-dashboard-fg">
            ${Number(method.extra_charge).toFixed(2)}
          </span>
        ) : (
          <span className="text-xs text-dashboard-muted">—</span>
        ),
    },
    {
      header: "Sort Order",
      render: (method) => (
        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-mono font-medium rounded-md bg-dashboard-muted-bg text-dashboard-fg border border-dashboard-border">
          {method.sort_order}
        </span>
      ),
    },
  ];

  return (
    <>
      <DataTable<SerializedPaymentMethod>
        title="Payment Methods"
        description="Manage storefront payment options. Methods are pre-configured system gateways; toggle active status or edit customer-facing descriptions, extra charges, and instructions."
        permissions={permissions}
        data={paymentMethods}
        columns={columns}
        filterConfig={{
          searchKey: "name",
          searchPlaceholder: "Search payment method name...",
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
              key: "provider",
              label: "Provider Slug",
              type: "text",
              isPrimary: true,
              placeholder: "Filter by provider...",
            },
            {
              key: "description",
              label: "Description Contains",
              type: "text",
              placeholder: "Search description...",
            },
          ],
        }}
        statusConfig={{
          statusKey: "is_active",
          onToggleStatus: async (item, newStatus) => {
            const res = await togglePaymentMethodStatus(item.id, newStatus);
            if (!res.success) {
              toast.error(
                res.message ?? "Failed to update payment method status.",
              );
              return { success: false, message: res.message };
            }
            toast.success(
              res.message ??
                `Payment method ${newStatus ? "enabled" : "disabled"} successfully.`,
            );
            return { success: true };
          },
        }}
        actionConfig={{
          onEdit: permissions.update ? (item) => setEditingMethod(item) : undefined,
        }}
        activityConfig={{
          userNames,
        }}
        paginationConfig={{
          totalItems: totalCount,
          currentPage,
          pageSize,
          itemName: "payment methods",
        }}
        emptyState={{
          title: "No payment methods found",
          description:
            "All payment methods are pre-configured by system seeding.",
        }}
      />

      <PaymentMethodModal
        isOpen={Boolean(editingMethod)}
        onClose={() => setEditingMethod(null)}
        initialData={editingMethod}
      />
    </>
  );
}
