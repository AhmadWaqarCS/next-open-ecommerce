"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CRUD } from "@/lib/types";
import { useToast } from "./toast-context";
import Modal from "./modal";
import {
  ColumnDef,
  FilterOption,
  CustomFilterConfig,
  formatActivityDate,
  resolveActivityUser,
} from "./data-table";

/* -------------------------------------------------------------------------- */
/*                               Type Definitions                             */
/* -------------------------------------------------------------------------- */

export type { ColumnDef, FilterOption, CustomFilterConfig };

export interface TrashTableFilterConfig {
  searchKey?: string;
  searchPlaceholder?: string;
  users?: { id: number; name: string | null; email: string }[];
  currentFilters?: Record<string, string | undefined>;
  customFilters?: CustomFilterConfig[];
  hideAuditFilters?: boolean;
  hideIdFilter?: boolean;
}

export interface TrashTablePaginationConfig {
  totalItems: number;
  currentPage?: number;
  pageSize?: number;
  itemName?: string;
  pageSizeOptions?: number[];
}

export interface TrashTableBulkConfig<T> {
  onBulkRestore?: (
    selectedIds: number[],
    selectAllScope: boolean,
  ) => Promise<{ success: boolean; message?: string }>;
  onBulkPermanentlyDelete?: (
    selectedIds: number[],
    selectAllScope: boolean,
  ) => Promise<{ success: boolean; message?: string }>;
  renderBulkActions?: (
    selectedIds: number[],
    selectAllScope: boolean,
    clearSelection: () => void,
  ) => React.ReactNode;
}

export interface TrashTableActionConfig<T> {
  onRestore?: (item: T) => Promise<{ success: boolean; message?: string }>;
  onPermanentlyDelete?: (item: T) => Promise<{ success: boolean; message?: string }>;
  restoreConfirmMessage?: (item: T) => string;
  deleteConfirmMessage?: (item: T) => string;
  renderActions?: (item: T) => React.ReactNode;
}

export interface TrashTableActivityConfig {
  userNames?: Record<number, string>;
  showAuditDates?: boolean;
}

export interface TrashTableProps<T extends { id: number }> {
  title: string;
  description: string;
  backHref: string;
  backLabel?: string;
  headerActions?: React.ReactNode;
  permissions: CRUD;
  data: T[];
  columns: ColumnDef<T>[];

  // Integrated Filter Bar Config
  filterConfig?: TrashTableFilterConfig;

  // Integrated Pagination Config
  paginationConfig?: TrashTablePaginationConfig;

  // Bulk Operations (Restore & Permanent Delete)
  bulkConfig?: TrashTableBulkConfig<T>;

  // Row Actions (Single Restore & Single Permanent Delete)
  actionConfig?: TrashTableActionConfig<T>;

  // Activity Column Config & Custom Renderer
  activityConfig?: TrashTableActivityConfig;
  renderActivity?: (item: T) => React.ReactNode;

  // Empty State
  emptyState?: {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    action?: React.ReactNode;
  };
}

/* -------------------------------------------------------------------------- */
/*                               Helper Functions                             */
/* -------------------------------------------------------------------------- */

export function TrashActivityCell({
  deletedBy,
  deletedAt,
  createdBy,
  createdAt,
  userNames = {},
  showAuditDates = true,
}: {
  deletedBy?: number | null;
  deletedAt?: Date | string | null;
  createdBy?: number | null;
  createdAt?: Date | string | null;
  userNames?: Record<number, string>;
  showAuditDates?: boolean;
}) {
  const delDate = formatActivityDate(deletedAt);
  const createdDate = formatActivityDate(createdAt);

  return (
    <div className="text-xs text-dashboard-muted font-medium space-y-0.5">
      <div>
        Deleted by:{" "}
        <span className="font-semibold text-dashboard-fg">
          {resolveActivityUser(deletedBy, userNames)}
        </span>
        {delDate && (
          <span className="text-[11px] opacity-75 ml-1">
            ({delDate})
          </span>
        )}
      </div>
      {showAuditDates && (createdBy !== undefined || createdAt !== undefined) && (
        <div className="text-[11px] opacity-80">
          Created:{" "}
          <span className="text-dashboard-fg font-medium">
            {resolveActivityUser(createdBy, userNames)}
          </span>
          {createdDate && <span className="ml-1">({createdDate})</span>}
        </div>
      )}
    </div>
  );
}

function calculatePaginationWindow(
  currentPage: number,
  totalPages: number,
  maxButtons: number = 5,
) {
  if (totalPages <= maxButtons) {
    return {
      pages: Array.from({ length: totalPages }, (_, i) => i + 1),
      showPreEllipsis: false,
      showPostEllipsis: false,
    };
  }

  const sideRange = Math.floor((maxButtons - 1) / 2);
  let startPage = Math.max(1, currentPage - sideRange);
  let endPage = startPage + maxButtons - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = totalPages - maxButtons + 1;
  }

  const pages: number[] = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return {
    pages,
    showPreEllipsis: startPage > 1,
    showPostEllipsis: endPage < totalPages,
  };
}

/* -------------------------------------------------------------------------- */
/*                            Main TrashTable Component                       */
/* -------------------------------------------------------------------------- */

export default function TrashTable<T extends { id: number }>({
  title,
  description,
  backHref,
  backLabel = "Back to Management",
  headerActions,
  permissions,
  data,
  columns,
  filterConfig,
  paginationConfig,
  bulkConfig,
  actionConfig,
  activityConfig,
  renderActivity,
  emptyState,
}: TrashTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectAllScope, setSelectAllScope] = useState<boolean>(false);

  // Modals state
  const [singleRestoreTarget, setSingleRestoreTarget] = useState<T | null>(null);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<T | null>(null);
  const [showBulkRestoreModal, setShowBulkRestoreModal] = useState<boolean>(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState<boolean>(false);

  // Advanced filter toggle
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Staged filter state (applied only when "Filter" button is clicked)
  const searchKey = filterConfig?.searchKey ?? "name";
  const [stagedSearch, setStagedSearch] = useState<string>("");
  const [stagedFilters, setStagedFilters] = useState<Record<string, string>>({});
  const [stagedOperators, setStagedOperators] = useState<Record<string, string>>({});

  // Direct page jump input state
  const [jumpPageInput, setJumpPageInput] = useState<string>("");

  // Sync initial filters from URL params
  useEffect(() => {
    if (!searchParams) return;
    const initialFilters: Record<string, string> = {};
    const initialOps: Record<string, string> = {};

    searchParams.forEach((value, key) => {
      if (key === searchKey) {
        setStagedSearch(value);
      } else if (key.endsWith("_op")) {
        initialOps[key.replace(/_op$/, "")] = value;
      } else if (key !== "page" && key !== "size") {
        initialFilters[key] = value;
      }
    });

    setStagedFilters(initialFilters);
    setStagedOperators(initialOps);
  }, [searchParams, searchKey]);

  // Pagination calculations
  const totalItems = paginationConfig?.totalItems ?? data.length;
  const currentPage =
    paginationConfig?.currentPage ??
    Math.max(1, Number(searchParams?.get("page") ?? 1));
  const pageSize =
    paginationConfig?.pageSize ??
    Math.max(1, Number(searchParams?.get("size") ?? 10));
  const itemName = paginationConfig?.itemName ?? "trashed items";
  const pageSizeOptions = paginationConfig?.pageSizeOptions ?? [10, 20, 50, 100];
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Selection calculations
  const pageItemIds = data.map((item) => item.id);
  const isAllPageSelected =
    pageItemIds.length > 0 &&
    pageItemIds.every((id) => selectedIds.includes(id));
  const hasSelection = selectedIds.length > 0 || selectAllScope;

  /* -------------------------------------------------------------------------- */
  /*                          URL Navigation / Filter Sync                      */
  /* -------------------------------------------------------------------------- */

  const navigateWithParams = (params: URLSearchParams) => {
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", "1");

    // Apply or remove search
    if (stagedSearch.trim()) {
      params.set(searchKey, stagedSearch.trim());
    } else {
      params.delete(searchKey);
    }

    // Apply or remove staged custom filters
    Object.entries(stagedFilters).forEach(([key, val]) => {
      if (val && val.trim()) {
        params.set(key, val.trim());
        if (stagedOperators[key]) {
          params.set(`${key}_op`, stagedOperators[key]);
        } else {
          params.delete(`${key}_op`);
        }
      } else {
        params.delete(key);
        params.delete(`${key}_op`);
      }
    });

    navigateWithParams(params);
  };

  const handleClearAllFilters = () => {
    const params = new URLSearchParams();
    const currentSize = searchParams?.get("size");
    if (currentSize) params.set("size", currentSize);
    params.set("page", "1");

    setStagedSearch("");
    setStagedFilters({});
    setStagedOperators({});
    navigateWithParams(params);
  };

  const handleRemoveSingleFilter = (key: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete(key);
    params.delete(`${key}_op`);
    params.set("page", "1");

    if (key === searchKey) {
      setStagedSearch("");
    } else {
      setStagedFilters((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setStagedOperators((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }

    navigateWithParams(params);
  };

  /* -------------------------------------------------------------------------- */
  /*                          Pagination Controls                               */
  /* -------------------------------------------------------------------------- */

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", newPage.toString());
    navigateWithParams(params);
  };

  const handlePageSizeChange = (newSize: number) => {
    try {
      localStorage.setItem(
        `pagination_pageSize_${itemName.replace(/\s+/g, "_")}`,
        newSize.toString(),
      );
    } catch {
      // Ignore storage errors in restricted contexts
    }
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", "1");
    params.set("size", newSize.toString());
    navigateWithParams(params);
  };

  const handleJumpPageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPage = Number(jumpPageInput);
    if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages) {
      handlePageChange(targetPage);
      setJumpPageInput("");
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                          Row / Header Selection                            */
  /* -------------------------------------------------------------------------- */

  const handleHeaderCheckboxClick = () => {
    if (!isAllPageSelected && !selectAllScope) {
      // 1st click: select all items on current page
      setSelectedIds(pageItemIds);
      setSelectAllScope(false);
    } else if (isAllPageSelected && !selectAllScope) {
      // 2nd click: select all items across all pages in scope
      setSelectAllScope(true);
    } else {
      // 3rd click: clear selection
      setSelectedIds([]);
      setSelectAllScope(false);
    }
  };

  const toggleRowSelect = (id: number) => {
    if (selectAllScope) {
      setSelectAllScope(false);
      setSelectedIds(pageItemIds.filter((itemId) => itemId !== id));
    } else {
      if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter((itemId) => itemId !== id));
      } else {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                          Action Handlers                                   */
  /* -------------------------------------------------------------------------- */

  const handleExecuteSingleRestore = () => {
    if (!singleRestoreTarget || !actionConfig?.onRestore) return;
    startTransition(async () => {
      const res = await actionConfig.onRestore!(singleRestoreTarget);
      if (res.success) {
        toast(res.message ?? "Item restored successfully", "success");
        setSingleRestoreTarget(null);
      } else {
        toast(res.message ?? "Failed to restore item", "error");
      }
    });
  };

  const handleExecuteSingleDelete = () => {
    if (!singleDeleteTarget || !actionConfig?.onPermanentlyDelete) return;
    startTransition(async () => {
      const res = await actionConfig.onPermanentlyDelete!(singleDeleteTarget);
      if (res.success) {
        toast(res.message ?? "Item permanently deleted", "success");
        setSingleDeleteTarget(null);
      } else {
        toast(res.message ?? "Failed to delete item permanently", "error");
      }
    });
  };

  const handleExecuteBulkRestore = () => {
    if (!bulkConfig?.onBulkRestore) return;
    startTransition(async () => {
      const res = await bulkConfig.onBulkRestore!(selectedIds, selectAllScope);
      if (res.success) {
        toast(res.message ?? "Selected items restored successfully", "success");
        setSelectedIds([]);
        setSelectAllScope(false);
        setShowBulkRestoreModal(false);
      } else {
        toast(res.message ?? "Failed to restore selected items", "error");
      }
    });
  };

  const handleExecuteBulkPermanentlyDelete = () => {
    if (!bulkConfig?.onBulkPermanentlyDelete) return;
    startTransition(async () => {
      const res = await bulkConfig.onBulkPermanentlyDelete!(
        selectedIds,
        selectAllScope,
      );
      if (res.success) {
        toast(res.message ?? "Selected items permanently deleted", "success");
        setSelectedIds([]);
        setSelectAllScope(false);
        setShowBulkDeleteModal(false);
      } else {
        toast(res.message ?? "Failed to permanently delete selected items", "error");
      }
    });
  };

  // Active filter badge count (excluding page/size)
  const activeParamKeys = Array.from(searchParams?.keys() ?? []).filter(
    (k) => k !== "page" && k !== "size" && !k.endsWith("_op"),
  );

  const { pages, showPreEllipsis, showPostEllipsis } =
    calculatePaginationWindow(currentPage, totalPages, 5);

  return (
    <div className="space-y-6 flex-1 flex flex-col relative min-h-[500px]">
      {/* ---------------------------------------------------------------------- */}
      {/* 1. Header Panel                                                        */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-dashboard-fg tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-dashboard-muted mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {headerActions}
          <Link
            href={backHref}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-dashboard-border bg-dashboard-card hover:bg-dashboard-card-hover text-dashboard-muted hover:text-dashboard-fg transition-all shadow-xs cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>{backLabel}</span>
          </Link>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. Integrated Global Filter Bar                                         */}
      {/* ---------------------------------------------------------------------- */}
      {filterConfig && (
        <div className="bg-dashboard-card border border-dashboard-border rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Main Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dashboard-muted">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder={filterConfig.searchPlaceholder ?? "Search trashed items..."}
                value={stagedSearch}
                onChange={(e) => setStagedSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApplyFilters();
                }}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted focus:outline-none focus:ring-2 focus:ring-dashboard-primary/20 focus:border-dashboard-primary transition-all"
              />
            </div>

            {/* Primary Custom Filters */}
            {filterConfig.customFilters
              ?.filter((cf) => cf.isPrimary)
              .map((cf) => (
                <div key={cf.key} className="flex items-center gap-1.5">
                  <select
                    value={stagedFilters[cf.key] ?? ""}
                    onChange={(e) =>
                      setStagedFilters((prev) => ({
                        ...prev,
                        [cf.key]: e.target.value,
                      }))
                    }
                    className="px-3 py-2 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg focus:outline-none focus:ring-2 focus:ring-dashboard-primary/20 focus:border-dashboard-primary transition-all cursor-pointer"
                  >
                    <option value="">{cf.label}: All</option>
                    {cf.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

            {/* More Filters Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border transition-all cursor-pointer ${
                showAdvancedFilters || activeParamKeys.length > 0
                  ? "border-dashboard-primary bg-dashboard-accent-subtle text-dashboard-accent-fg"
                  : "border-dashboard-border bg-dashboard-muted-bg text-dashboard-muted hover:bg-dashboard-card-hover"
              }`}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span>More Filters</span>
              {activeParamKeys.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-dashboard-primary text-[11px] font-bold text-dashboard-primary-fg">
                  {activeParamKeys.length}
                </span>
              )}
            </button>

            {/* Filter Action Button */}
            <button
              type="button"
              onClick={handleApplyFilters}
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span>Filter</span>
            </button>

            {/* Clear All Button */}
            {activeParamKeys.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-xs font-semibold text-dashboard-muted hover:text-dashboard-danger transition-colors cursor-pointer px-2 py-1"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Expandable Advanced Filter Fields */}
          {showAdvancedFilters && (
            <div className="pt-3 border-t border-dashboard-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              {/* Secondary Custom Filters */}
              {filterConfig.customFilters
                ?.filter((cf) => !cf.isPrimary)
                .map((cf) => {
                  if (cf.type === "select" || (!cf.type && cf.options)) {
                    return (
                      <div key={cf.key}>
                        <label className="block font-semibold text-dashboard-muted mb-1">
                          {cf.label}
                        </label>
                        <select
                          value={stagedFilters[cf.key] ?? ""}
                          onChange={(e) =>
                            setStagedFilters((prev) => ({
                              ...prev,
                              [cf.key]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg focus:outline-none focus:ring-2 focus:ring-dashboard-primary/20 focus:border-dashboard-primary cursor-pointer"
                        >
                          <option value="">All</option>
                          {cf.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (cf.type === "number") {
                    return (
                      <div key={cf.key} className="space-y-1">
                        <label className="block font-semibold text-dashboard-muted">
                          {cf.label}
                        </label>
                        <div className="flex gap-1">
                          <select
                            value={stagedOperators[cf.key] ?? "eq"}
                            onChange={(e) =>
                              setStagedOperators((prev) => ({
                                ...prev,
                                [cf.key]: e.target.value,
                              }))
                            }
                            className="w-20 px-1.5 py-1.5 rounded-lg border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg text-xs cursor-pointer"
                          >
                            <option value="eq">=</option>
                            <option value="not_eq">!=</option>
                            <option value="gt">&gt;</option>
                            <option value="gte">&gt;=</option>
                            <option value="lt">&lt;</option>
                            <option value="lte">&lt;=</option>
                          </select>
                          <input
                            type="number"
                            placeholder={cf.placeholder ?? "Value"}
                            value={stagedFilters[cf.key] ?? ""}
                            onChange={(e) =>
                              setStagedFilters((prev) => ({
                                ...prev,
                                [cf.key]: e.target.value,
                              }))
                            }
                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted focus:outline-none focus:ring-2 focus:ring-dashboard-primary/20 focus:border-dashboard-primary"
                          />
                        </div>
                      </div>
                    );
                  }

                  if (cf.type === "date") {
                    return (
                      <div key={cf.key} className="space-y-1">
                        <label className="block font-semibold text-dashboard-muted">
                          {cf.label}
                        </label>
                        <div className="flex gap-1">
                          <select
                            value={stagedOperators[cf.key] ?? "eq"}
                            onChange={(e) =>
                              setStagedOperators((prev) => ({
                                ...prev,
                                [cf.key]: e.target.value,
                              }))
                            }
                            className="w-24 px-1.5 py-1.5 rounded-lg border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg text-xs cursor-pointer"
                          >
                            <option value="eq">On</option>
                            <option value="before">Before</option>
                            <option value="after">After</option>
                          </select>
                          <input
                            type="date"
                            value={stagedFilters[cf.key] ?? ""}
                            onChange={(e) =>
                              setStagedFilters((prev) => ({
                                ...prev,
                                [cf.key]: e.target.value,
                              }))
                            }
                            className="flex-1 px-2.5 py-1 rounded-lg border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg cursor-pointer"
                          />
                        </div>
                      </div>
                    );
                  }

                  // Default text input with operator dropdown
                  return (
                    <div key={cf.key} className="space-y-1">
                      <label className="block font-semibold text-dashboard-muted">
                        {cf.label}
                      </label>
                      <div className="flex gap-1">
                        <select
                          value={stagedOperators[cf.key] ?? "contains"}
                          onChange={(e) =>
                            setStagedOperators((prev) => ({
                              ...prev,
                              [cf.key]: e.target.value,
                            }))
                          }
                          className="w-24 px-1.5 py-1.5 rounded-lg border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg text-xs cursor-pointer"
                        >
                          <option value="contains">Contains</option>
                          <option value="not_contains">Does not</option>
                          <option value="starts_with">Starts with</option>
                          <option value="ends_with">Ends with</option>
                          <option value="eq">Exact</option>
                        </select>
                        <input
                          type="text"
                          placeholder={cf.placeholder ?? "Value"}
                          value={stagedFilters[cf.key] ?? ""}
                          onChange={(e) =>
                            setStagedFilters((prev) => ({
                              ...prev,
                              [cf.key]: e.target.value,
                            }))
                          }
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted focus:outline-none focus:ring-2 focus:ring-dashboard-primary/20 focus:border-dashboard-primary"
                        />
                      </div>
                    </div>
                  );
                })}

              {/* Record ID Filter */}
              {!filterConfig.hideIdFilter && (
                <div>
                  <label className="block font-semibold text-dashboard-muted mb-1">
                    Record ID
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1"
                    value={stagedFilters.id ?? ""}
                    onChange={(e) =>
                      setStagedFilters((prev) => ({
                        ...prev,
                        id: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted focus:outline-none focus:ring-2 focus:ring-dashboard-primary/20 focus:border-dashboard-primary"
                  />
                </div>
              )}

              {/* Audit Filters */}
              {!filterConfig.hideAuditFilters && (
                <>
                  {filterConfig.users && filterConfig.users.length > 0 && (
                    <div>
                      <label className="block font-semibold text-dashboard-muted mb-1">
                        Deleted By User
                      </label>
                      <select
                        value={stagedFilters.deleted_by ?? stagedFilters.created_by ?? ""}
                        onChange={(e) =>
                          setStagedFilters((prev) => ({
                            ...prev,
                            deleted_by: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg cursor-pointer"
                      >
                        <option value="">All Users</option>
                        {filterConfig.users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name ?? u.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-dashboard-muted mb-1">
                      Deleted Date From
                    </label>
                    <input
                      type="date"
                      value={stagedFilters.deleted_from ?? stagedFilters.created_from ?? ""}
                      onChange={(e) =>
                        setStagedFilters((prev) => ({
                          ...prev,
                          deleted_from: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-1 rounded-lg border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-dashboard-muted mb-1">
                      Deleted Date To
                    </label>
                    <input
                      type="date"
                      value={stagedFilters.deleted_to ?? stagedFilters.created_to ?? ""}
                      onChange={(e) =>
                        setStagedFilters((prev) => ({
                          ...prev,
                          deleted_to: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-1 rounded-lg border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg cursor-pointer"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Active Filter Badges */}
          {activeParamKeys.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dashboard-border-subtle">
              <span className="text-xs font-semibold text-dashboard-muted mr-1">
                Active Filters:
              </span>
              {activeParamKeys.map((key) => {
                const val = searchParams?.get(key);
                const op = searchParams?.get(`${key}_op`);
                let label = `${key}: ${val}`;
                if (key === searchKey) label = `Search: "${val}"`;
                else if (key === "id") label = `ID: #${val}`;
                else if (op) label = `${key} (${op}): ${val}`;

                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-dashboard-accent-subtle text-dashboard-accent-fg"
                  >
                    <span>{label}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSingleFilter(key)}
                      className="hover:opacity-75 font-bold ml-0.5 cursor-pointer"
                      title="Remove filter"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 3. Table Element or Empty State                                        */}
      {/* ---------------------------------------------------------------------- */}
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-dashboard-border rounded-2xl p-12 bg-dashboard-card text-center my-4">
          <div className="h-12 w-12 rounded-xl bg-dashboard-muted-bg flex items-center justify-center text-dashboard-muted mb-4">
            {emptyState?.icon ?? (
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            )}
          </div>
          <h3 className="text-lg font-bold text-dashboard-fg mb-1">
            {emptyState?.title ?? "Trash is empty"}
          </h3>
          <p className="text-sm text-dashboard-muted max-w-sm mb-6">
            {emptyState?.description ??
              "There are no deleted items in the archive."}
          </p>
          {emptyState?.action ?? (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-dashboard-border bg-dashboard-card hover:bg-dashboard-card-hover text-dashboard-fg transition-all shadow-xs cursor-pointer"
            >
              <span>{backLabel}</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-dashboard-card border border-dashboard-border rounded-2xl shadow-xs overflow-hidden flex flex-col mb-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-dashboard-muted">
              <thead className="bg-dashboard-table-header border-b border-dashboard-border">
                <tr>
                  {/* Select All Checkbox Header */}
                  <th className="pl-6 py-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected || selectAllScope}
                      onChange={handleHeaderCheckboxClick}
                      className="h-4 w-4 rounded-md border-dashboard-border text-dashboard-primary focus:ring-dashboard-primary cursor-pointer"
                      title={
                        selectAllScope
                          ? "All scope items selected. Click to deselect all."
                          : isAllPageSelected
                            ? "Page items selected. Click to select all scope items."
                            : "Click to select current page items."
                      }
                    />
                  </th>
                  {/* ID Header */}
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-dashboard-muted w-16">
                    ID
                  </th>
                  {/* Dynamic Custom Columns */}
                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-dashboard-muted ${
                        col.className ?? ""
                      }`}
                    >
                      {col.header}
                    </th>
                  ))}
                  {/* Activity Column Header */}
                  {(activityConfig || renderActivity) && (
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-dashboard-muted">
                      Deleted Activity
                    </th>
                  )}
                  {/* Actions Column Header */}
                  {(actionConfig || permissions.delete) && (
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-dashboard-muted text-right pr-6">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-dashboard-border-subtle [&_tr:nth-child(odd)]:bg-dashboard-table-odd [&_tr:nth-child(even)]:bg-dashboard-table-even">
                {data.map((item) => {
                  const isRowChecked =
                    selectAllScope || selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-dashboard-table-hover ${
                        isRowChecked ? "bg-dashboard-table-selected" : ""
                      }`}
                    >
                      {/* Row Checkbox */}
                      <td
                        className="pl-6 py-4 w-10 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isRowChecked}
                          onChange={() => toggleRowSelect(item.id)}
                          className="h-4 w-4 rounded-md border-dashboard-border text-dashboard-primary focus:ring-dashboard-primary cursor-pointer"
                        />
                      </td>

                      {/* ID Cell */}
                      <td className="px-4 py-4 whitespace-nowrap text-xs font-semibold text-dashboard-muted">
                        #{item.id}
                      </td>

                      {/* Custom Columns */}
                      {columns.map((col, idx) => (
                        <td
                          key={idx}
                          className={`px-6 py-4 whitespace-nowrap text-sm text-dashboard-fg ${
                            col.className ?? ""
                          }`}
                        >
                          {col.render(item)}
                        </td>
                      ))}

                      {/* Activity Cell */}
                      {(activityConfig || renderActivity) && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderActivity ? (
                            renderActivity(item)
                          ) : (
                            <TrashActivityCell
                              deletedBy={(item as any).deleted_by}
                              deletedAt={(item as any).deleted_at}
                              createdBy={(item as any).created_by}
                              createdAt={(item as any).created_at}
                              userNames={activityConfig?.userNames}
                              showAuditDates={activityConfig?.showAuditDates}
                            />
                          )}
                        </td>
                      )}

                      {/* Actions Cell */}
                      {(actionConfig || permissions.delete) && (
                        <td
                          className="px-6 py-4 whitespace-nowrap text-right pr-6"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {actionConfig?.renderActions ? (
                            actionConfig.renderActions(item)
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              {permissions.delete && actionConfig?.onRestore && (
                                <button
                                  type="button"
                                  onClick={() => setSingleRestoreTarget(item)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-dashboard-border bg-dashboard-card hover:bg-dashboard-card-hover text-dashboard-fg transition-colors cursor-pointer"
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
                              {permissions.delete &&
                                actionConfig?.onPermanentlyDelete && (
                                  <button
                                    type="button"
                                    onClick={() => setSingleDeleteTarget(item)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-dashboard-danger/30 bg-dashboard-card hover:bg-dashboard-danger-subtle text-dashboard-danger transition-colors cursor-pointer"
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
                                    <span>Delete Permanently</span>
                                  </button>
                                )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 4. Floating Bulk Actions Pop-up (Shows above pagination when >= 2)     */}
      {/* ---------------------------------------------------------------------- */}
      {hasSelection && (selectedIds.length >= 2 || selectAllScope) && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 max-w-2xl w-[90%] sm:w-auto bg-dashboard-floating-bg border border-dashboard-floating-border rounded-2xl shadow-xl backdrop-blur-md px-5 py-3 flex flex-wrap items-center justify-between gap-4 animate-slide-up">
          <div className="flex items-center gap-2 text-sm font-semibold text-dashboard-fg">
            <span className="flex h-2.5 w-2.5 rounded-full bg-dashboard-accent animate-pulse" />
            {selectAllScope ? (
              <span>All {totalItems} trashed items in scope selected.</span>
            ) : (
              <span>
                {selectedIds.length} item{selectedIds.length > 1 ? "s" : ""}{" "}
                selected.
                {totalItems > pageItemIds.length && (
                  <button
                    type="button"
                    onClick={() => setSelectAllScope(true)}
                    className="ml-1 text-dashboard-accent underline font-bold cursor-pointer"
                  >
                    Select all {totalItems} trashed items
                  </button>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {bulkConfig?.renderBulkActions &&
              bulkConfig.renderBulkActions(selectedIds, selectAllScope, () => {
                setSelectedIds([]);
                setSelectAllScope(false);
              })}

            {permissions.delete && bulkConfig?.onBulkRestore && (
              <button
                type="button"
                onClick={() => setShowBulkRestoreModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg transition-colors cursor-pointer"
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
                <span>Restore Selected</span>
              </button>
            )}

            {permissions.delete && bulkConfig?.onBulkPermanentlyDelete && (
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-dashboard-danger hover:bg-dashboard-danger-hover text-dashboard-danger-fg transition-colors cursor-pointer"
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
                <span>Delete Permanently</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedIds([]);
                setSelectAllScope(false);
              }}
              className="text-xs text-dashboard-muted hover:text-dashboard-fg font-medium px-2 py-1 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 5. Sticky Bottom Pagination Component                                  */}
      {/* ---------------------------------------------------------------------- */}
      <div
        className={`mt-auto sticky bottom-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-dashboard-border bg-dashboard-card/95 backdrop-blur-md py-3.5 px-6 md:px-8 -mx-6 md:-mx-8 -mb-6 md:-mb-8 shadow-md transition-opacity ${
          isPending ? "opacity-60 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Info & Items Per Page */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-dashboard-muted">
          <p>
            Showing{" "}
            <span className="font-semibold text-dashboard-fg">{startItem}</span>{" "}
            to{" "}
            <span className="font-semibold text-dashboard-fg">{endItem}</span>{" "}
            of{" "}
            <span className="font-semibold text-dashboard-fg">
              {totalItems}
            </span>{" "}
            {itemName}{" "}
            <span className="text-xs opacity-75">
              (Page {currentPage} of {totalPages})
            </span>
          </p>

          <div className="flex items-center gap-1.5 pl-3 border-l border-dashboard-border">
            <label htmlFor="trash-table-page-size" className="sr-only">
              Items per page
            </label>
            <select
              id="trash-table-page-size"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-dashboard-border bg-dashboard-card text-dashboard-fg cursor-pointer outline-none focus:ring-2 focus:ring-dashboard-primary/20"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / page
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Numbered Pagination & Direct Jump */}
        <div className="flex items-center gap-2">
          {/* Direct Jump To Page Input */}
          <form
            onSubmit={handleJumpPageSubmit}
            className="flex items-center gap-1 text-xs text-dashboard-muted mr-2"
          >
            <span>Go to:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              placeholder="#"
              className="w-12 px-1.5 py-1 rounded-md border border-dashboard-border bg-dashboard-card text-dashboard-fg text-center text-xs"
            />
            <button
              type="submit"
              className="px-2 py-1 rounded-md border border-dashboard-border hover:bg-dashboard-card-hover text-dashboard-fg font-semibold cursor-pointer"
            >
              Go
            </button>
          </form>

          {/* Previous Page Button */}
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className="p-1.5 rounded-lg border border-dashboard-border bg-dashboard-card text-dashboard-muted hover:bg-dashboard-card-hover hover:text-dashboard-fg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Pre Ellipsis */}
          {showPreEllipsis && (
            <span className="px-1.5 text-sm text-dashboard-muted select-none">
              ...
            </span>
          )}

          {/* Max 5 Numbered Buttons */}
          {pages.map((pageNum) => {
            const isCurrent = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => handlePageChange(pageNum)}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-dashboard-primary text-dashboard-primary-fg shadow-sm"
                    : "text-dashboard-muted hover:bg-dashboard-card-hover hover:text-dashboard-fg"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          {/* Post Ellipsis */}
          {showPostEllipsis && (
            <span className="px-1.5 text-sm text-dashboard-muted select-none">
              ...
            </span>
          )}

          {/* Next Page Button */}
          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
            className="p-1.5 rounded-lg border border-dashboard-border bg-dashboard-card text-dashboard-muted hover:bg-dashboard-card-hover hover:text-dashboard-fg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 6. Single Item Restore Confirmation Modal                              */}
      {/* ---------------------------------------------------------------------- */}
      <Modal
        isOpen={!!singleRestoreTarget}
        onClose={() => setSingleRestoreTarget(null)}
      >
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-dashboard-fg flex items-center gap-2">
            <svg
              className="h-5 w-5 text-dashboard-primary"
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
            <span>Confirm Restore</span>
          </h3>
          <p className="text-sm text-dashboard-muted">
            {singleRestoreTarget &&
              (actionConfig?.restoreConfirmMessage
                ? actionConfig.restoreConfirmMessage(singleRestoreTarget)
                : `Are you sure you want to restore item #${singleRestoreTarget.id}? It will be returned to active management.`)}
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSingleRestoreTarget(null)}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-dashboard-border bg-dashboard-card hover:bg-dashboard-card-hover text-dashboard-fg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteSingleRestore}
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPending ? "Restoring..." : "Restore Item"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ---------------------------------------------------------------------- */}
      {/* 7. Single Item Permanent Delete Confirmation Modal                     */}
      {/* ---------------------------------------------------------------------- */}
      <Modal
        isOpen={!!singleDeleteTarget}
        onClose={() => setSingleDeleteTarget(null)}
      >
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-dashboard-danger flex items-center gap-2">
            <svg
              className="h-5 w-5"
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
            <span>Confirm Permanent Deletion</span>
          </h3>
          <p className="text-sm text-dashboard-muted">
            {singleDeleteTarget &&
              (actionConfig?.deleteConfirmMessage
                ? actionConfig.deleteConfirmMessage(singleDeleteTarget)
                : `Are you sure you want to permanently delete item #${singleDeleteTarget.id}? This action cannot be undone.`)}
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSingleDeleteTarget(null)}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-dashboard-border bg-dashboard-card hover:bg-dashboard-card-hover text-dashboard-fg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteSingleDelete}
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-dashboard-danger hover:bg-dashboard-danger-hover text-dashboard-danger-fg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPending ? "Deleting..." : "Permanently Delete"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ---------------------------------------------------------------------- */}
      {/* 8. Bulk Restore Confirmation Modal                                     */}
      {/* ---------------------------------------------------------------------- */}
      <Modal
        isOpen={showBulkRestoreModal}
        onClose={() => setShowBulkRestoreModal(false)}
      >
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-dashboard-fg">
            Confirm Bulk Restore
          </h3>
          <p className="text-sm text-dashboard-muted">
            Are you sure you want to restore{" "}
            <span className="font-bold text-dashboard-fg">
              {selectAllScope
                ? `all ${totalItems} trashed items in scope`
                : `${selectedIds.length} selected item(s)`}
            </span>
            ? They will be returned to active management.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowBulkRestoreModal(false)}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-dashboard-border bg-dashboard-card hover:bg-dashboard-card-hover text-dashboard-fg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteBulkRestore}
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPending ? "Restoring..." : "Restore Items"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ---------------------------------------------------------------------- */}
      {/* 9. Bulk Permanently Delete Confirmation Modal                           */}
      {/* ---------------------------------------------------------------------- */}
      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
      >
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-dashboard-danger">
            Confirm Bulk Permanent Deletion
          </h3>
          <p className="text-sm text-dashboard-muted">
            Are you sure you want to permanently delete{" "}
            <span className="font-bold text-dashboard-fg">
              {selectAllScope
                ? `all ${totalItems} trashed items in scope`
                : `${selectedIds.length} selected item(s)`}
            </span>
            ? This action <span className="font-bold text-dashboard-danger">cannot be undone</span>.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(false)}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-dashboard-border bg-dashboard-card hover:bg-dashboard-card-hover text-dashboard-fg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteBulkPermanentlyDelete}
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-dashboard-danger hover:bg-dashboard-danger-hover text-dashboard-danger-fg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPending ? "Deleting..." : "Permanently Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
