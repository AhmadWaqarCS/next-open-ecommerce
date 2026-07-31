"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { CRUD } from "@/lib/types";
import { useToast } from "./toast-context";
import Modal from "./modal";

export interface ColumnDef<T> {
  header: string;
  className?: string;
  render: (item: T) => React.ReactNode;
}

interface TrashTableProps<T extends { id: number }> {
  title: string;
  description: string;
  backHref: string;
  backLabel?: string;
  filterBar?: React.ReactNode;
  permissions: CRUD;
  data: T[];
  totalCount?: number;
  columns: ColumnDef<T>[];
  renderActivity?: (item: T) => React.ReactNode;
  renderActions?: (item: T) => React.ReactNode;
  onBulkRestore?: (
    selectedIds: number[],
    selectAllScope: boolean
  ) => Promise<{ success: boolean; message?: string }>;
  onBulkPermanentlyDelete?: (
    selectedIds: number[],
    selectAllScope: boolean
  ) => Promise<{ success: boolean; message?: string }>;
  emptyState?: {
    title?: string;
    description?: string;
  };
}

export default function TrashTable<T extends { id: number }>({
  title,
  description,
  backHref,
  backLabel = "Back to Management",
  filterBar,
  permissions,
  data,
  totalCount,
  columns,
  renderActivity,
  renderActions,
  onBulkRestore,
  onBulkPermanentlyDelete,
  emptyState,
}: TrashTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectAllScope, setSelectAllScope] = useState<boolean>(false);
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  const [isActionPending, startActionTransition] = useTransition();
  const { toast } = useToast();

  const pageItemIds = data.map((item) => item.id);
  const isAllPageSelected =
    pageItemIds.length > 0 &&
    pageItemIds.every((id) => selectedIds.includes(id));

  const handleHeaderCheckboxClick = () => {
    if (!isAllPageSelected && !selectAllScope) {
      setSelectedIds(pageItemIds);
      setSelectAllScope(false);
    } else if (isAllPageSelected && !selectAllScope) {
      setSelectAllScope(true);
    } else {
      setSelectedIds([]);
      setSelectAllScope(false);
    }
  };

  const toggleRowSelect = (id: number) => {
    if (selectAllScope) {
      setSelectAllScope(false);
      setSelectedIds(pageItemIds.filter((itemKey) => itemKey !== id));
    } else {
      if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter((itemKey) => itemKey !== id));
      } else {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const handleExecuteBulkRestore = () => {
    if (!onBulkRestore) return;
    startActionTransition(async () => {
      const result = await onBulkRestore(selectedIds, selectAllScope);
      if (result.success) {
        toast(result.message ?? "Items restored successfully.", "success");
        setSelectedIds([]);
        setSelectAllScope(false);
        setShowRestoreModal(false);
      } else {
        toast(result.message ?? "Failed to restore selected items.", "error");
      }
    });
  };

  const handleExecuteBulkPermanentlyDelete = () => {
    if (!onBulkPermanentlyDelete) return;
    startActionTransition(async () => {
      const result = await onBulkPermanentlyDelete(selectedIds, selectAllScope);
      if (result.success) {
        toast(result.message ?? "Items permanently deleted.", "success");
        setSelectedIds([]);
        setSelectAllScope(false);
        setShowDeleteModal(false);
      } else {
        toast(
          result.message ?? "Failed to permanently delete selected items.",
          "error"
        );
      }
    });
  };

  const hasSelection = selectedIds.length > 0 || selectAllScope;

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>
        <Link
          href={backHref}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 dark:text-zinc-400 transition-all shadow-xs cursor-pointer"
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

      {/* Filter Bar */}
      {filterBar}

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 bg-white dark:bg-zinc-900 text-center">
          <div className="h-12 w-12 rounded-xl bg-zinc-50 dark:bg-zinc-800/55 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-4">
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
          </div>
          <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 mb-1">
            {emptyState?.title ?? "Trash is empty"}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
            {emptyState?.description ?? "There are no deleted items in the archive."}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          {/* Bulk Selection Action Bar */}
          {hasSelection && (
            <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-900/50 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                {selectAllScope ? (
                  <span>
                    All {totalCount ? `${totalCount} ` : ""}trashed items in scope selected. Click header checkbox again to unselect all.
                  </span>
                ) : (
                  <span>
                    {selectedIds.length} item{selectedIds.length > 1 ? "s" : ""} on this page selected.
                    {totalCount && totalCount > pageItemIds.length
                      ? ` Click header checkbox again to select all ${totalCount} trashed items across all pages.`
                      : " Click header checkbox again to unselect all."}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {permissions.delete && onBulkRestore && (
                  <button
                    onClick={() => setShowRestoreModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-zinc-900 dark:text-emerald-400 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
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
                {permissions.delete && onBulkPermanentlyDelete && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
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
            </div>
          )}

          {/* Table Element with 3-row cyclic grey styling on tbody */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-zinc-500 dark:text-zinc-400">
              <thead className="bg-zinc-50/90 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="pl-6 py-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected || selectAllScope}
                      onChange={handleHeaderCheckboxClick}
                      className="h-4 w-4 rounded-md border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-16">
                    ID
                  </th>
                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 ${
                        col.className ?? ""
                      }`}
                    >
                      {col.header}
                    </th>
                  ))}
                  {renderActivity && (
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Deleted Activity
                    </th>
                  )}
                  {renderActions && (
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-right">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80 [&_tr:nth-child(odd)]:bg-zinc-50/70 dark:[&_tr:nth-child(odd)]:bg-zinc-900/50 [&_tr:nth-child(even)]:bg-zinc-100/60 dark:[&_tr:nth-child(even)]:bg-zinc-800/30">
                {data.map((item) => {
                  const isRowChecked =
                    selectAllScope || selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors ${
                        isRowChecked ? "bg-emerald-50/60 dark:bg-emerald-950/30" : ""
                      }`}
                    >
                      <td className="pl-6 py-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isRowChecked}
                          onChange={() => toggleRowSelect(item.id)}
                          className="h-4 w-4 rounded-md border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        #{item.id}
                      </td>
                      {columns.map((col, idx) => (
                        <td
                          key={idx}
                          className={`px-6 py-4 whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-300 ${
                            col.className ?? ""
                          }`}
                        >
                          {col.render(item)}
                        </td>
                      ))}
                      {renderActivity && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderActivity(item)}
                        </td>
                      )}
                      {renderActions && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {renderActions(item)}
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

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
      >
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Confirm Bulk Restore
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Are you sure you want to restore{" "}
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {selectAllScope
                ? `all ${totalCount ?? ""} trashed items`
                : `${selectedIds.length} selected item(s)`}
            </span>
            ?
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setShowRestoreModal(false)}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteBulkRestore}
              disabled={isActionPending}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {isActionPending ? "Restoring..." : "Restore Items"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Permanently Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      >
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-red-600 dark:text-red-400">
            Confirm Permanent Deletion
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Are you sure you want to permanently delete{" "}
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {selectAllScope
                ? `all ${totalCount ?? ""} trashed items`
                : `${selectedIds.length} selected item(s)`}
            </span>
            ? This action <span className="font-bold text-red-600">cannot be undone</span>.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteBulkPermanentlyDelete}
              disabled={isActionPending}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {isActionPending ? "Deleting..." : "Permanently Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
