"use client";

import { useState, useTransition } from "react";
import {
  deleteNewsletterSubscriber,
  bulkDeleteNewsletterSubscribers,
} from "@/actions/newsletter-actions";
import { CRUD, newsletter_subscriber } from "@/lib/types";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import Modal from "@/app/(dashboard)/_components/modal";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";
import { NewsletterFilterParams } from "@/lib/filters/newsletter-filters";

interface NewsletterTableProps {
  subscribers: newsletter_subscriber[];
  filterParams?: NewsletterFilterParams;
  permissions: CRUD;
  totalCount?: number;
}

export default function NewsletterTable({
  subscribers,
  filterParams = {},
  permissions,
  totalCount,
}: NewsletterTableProps) {
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [selectedDeleteSubscriber, setSelectedDeleteSubscriber] =
    useState<newsletter_subscriber | null>(null);
  const { toast } = useToast();

  const handleDeleteSubscriber = (id: number) => {
    startDeleteTransition(async () => {
      const response = await deleteNewsletterSubscriber(id);
      if (!response.success) {
        toast(response.message ?? "Failed to delete subscriber", "error");
        return;
      }
      setSelectedDeleteSubscriber(null);
      toast(response.message ?? "Subscriber deleted successfully", "success");
    });
  };

  const columns: ColumnDef<newsletter_subscriber>[] = [
    {
      header: "ID",
      render: (s) => (
        <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
          #{s.id}
        </span>
      ),
    },
    {
      header: "Email Address",
      render: (s) => (
        <div className="font-semibold text-zinc-900 dark:text-zinc-50">
          {s.email}
        </div>
      ),
    },
    {
      header: "Subscribed Date",
      render: (s) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {new Date(s.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
  ];

  return (
    <>
      <DataTable
        title="Newsletter Subscribers"
        description="View and manage email subscriptions for marketing updates."
        filterBar={
          <GlobalFilterBar
            searchKey="email"
            searchPlaceholder="Search subscriber email..."
            currentFilters={filterParams as Record<string, string | undefined>}
            hideAuditFilters={true}
            customFilters={[
              {
                key: "created_from",
                label: "Subscribed Date From",
                type: "date",
              },
              {
                key: "created_to",
                label: "Subscribed Date To",
                type: "date",
              },
            ]}
          />
        }
        permissions={permissions}
        data={subscribers}
        totalCount={totalCount}
        columns={columns}
        renderActions={(s) => (
          <div className="flex items-center justify-end">
            {permissions.delete && (
              <button
                onClick={() => setSelectedDeleteSubscriber(s)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 bg-white hover:bg-red-50 hover:text-red-750 text-red-600 dark:border-red-900/30 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-955/20 transition-colors cursor-pointer"
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
          bulkDeleteNewsletterSubscribers(ids, selectAllScope, filterParams)
        }
        emptyState={{
          title: "No subscribers found",
          description:
            "There are currently no newsletter email subscribers registered in the database.",
        }}
      />

      {/* Delete Subscriber Confirmation Modal */}
      <Modal
        isOpen={!!selectedDeleteSubscriber}
        onClose={() => setSelectedDeleteSubscriber(null)}
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
            <span>Delete Subscriber</span>
          </h3>
          <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2 leading-relaxed">
            Are you sure you want to permanently delete newsletter subscription for{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {selectedDeleteSubscriber?.email}
            </span>
            ? This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-zinc-150 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setSelectedDeleteSubscriber(null)}
            className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleDeleteSubscriber(selectedDeleteSubscriber?.id!)}
            disabled={isDeletePending}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-650 hover:bg-red-700 text-white shadow-lg shadow-red-500/10 transition-colors disabled:opacity-50"
          >
            {isDeletePending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>
    </>
  );
}
