"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import GlobalFilterBar, { CustomFilterConfig } from "@/app/(dashboard)/_components/global-filter-bar";
import { CRUD } from "@/lib/types";
import { EmailGroupFilterParams } from "@/lib/filters/email-group-filters";
import {
  createEmailGroupAction,
  deleteEmailGroupAction,
} from "@/actions/email-group-actions";

export interface SerializedEmailGroup {
  id: number;
  name: string;
  description: string | null;
  member_count: number;
  created_at: string;
}

interface EmailGroupTableProps {
  groups: SerializedEmailGroup[];
  filterParams: EmailGroupFilterParams;
  permissions: CRUD;
  totalCount: number;
}

export default function EmailGroupTable({
  groups,
  filterParams,
  permissions,
  totalCount,
}: EmailGroupTableProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const res = await createEmailGroupAction({ name, description });
    setLoading(false);

    if (res.success) {
      showToast("Email group created!");
      setIsModalOpen(false);
      setName("");
      setDescription("");
      router.refresh();
    } else {
      showToast(res.message || "Failed to create group.", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this email group?")) return;

    const res = await deleteEmailGroupAction(id);
    if (res.success) {
      showToast("Email group deleted.");
      router.refresh();
    } else {
      showToast(res.message || "Failed to delete group.", "error");
    }
  };

  const customFilters: CustomFilterConfig[] = [
    {
      key: "min_members",
      label: "Min Members",
      type: "number",
      placeholder: "e.g. 5",
      isPrimary: true,
    },
    {
      key: "max_members",
      label: "Max Members",
      type: "number",
      placeholder: "e.g. 100",
    },
    {
      key: "created_from",
      label: "Created From",
      type: "date",
    },
    {
      key: "created_to",
      label: "Created To",
      type: "date",
    },
  ];

  const columns: ColumnDef<SerializedEmailGroup>[] = [
    {
      header: "Group Name",
      render: (item) => (
        <div>
          <Link
            href={`/dashboard/email-groups/${item.id}`}
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-base"
          >
            {item.name}
          </Link>
          {item.description && (
            <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{item.description}</p>
          )}
        </div>
      ),
    },
    {
      header: "Member Count",
      render: (item) => (
        <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full">
          {item.member_count} members
        </span>
      ),
    },
    {
      header: "Created Date",
      render: (item) => (
        <span className="text-xs text-zinc-500">
          {new Date(item.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <DataTable
        title="Email Groups"
        description="Organize customer contacts into targeted marketing subscriber segments"
        permissions={permissions}
        data={groups}
        totalCount={totalCount}
        columns={columns}
        createButton={
          permissions.create ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition"
            >
              + Create Email Group
            </button>
          ) : undefined
        }
        filterBar={
          <GlobalFilterBar
            searchKey="name"
            searchPlaceholder="Search email groups by name or description..."
            currentFilters={filterParams as Record<string, string | undefined>}
            customFilters={customFilters}
          />
        }
        renderActions={(item) => (
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/dashboard/email-groups/${item.id}`}
              className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-xs rounded-lg hover:bg-zinc-200 transition"
            >
              View Members
            </Link>
            {permissions.delete && (
              <button
                onClick={() => handleDelete(item.id)}
                className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-xs rounded-lg hover:bg-rose-100 transition"
              >
                Delete
              </button>
            )}
          </div>
        )}
        emptyState={{
          title: "No Email Groups Found",
          description: "No email groups match your filter parameters.",
        }}
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Create Email Group
            </h3>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">
                Group Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. VIP Repeat Buyers"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Targeted list of customers who have ordered multiple times..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
              >
                {loading ? "Creating..." : "Create Group"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
