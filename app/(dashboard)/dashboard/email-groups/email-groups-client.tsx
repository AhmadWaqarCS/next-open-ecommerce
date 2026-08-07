"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createEmailGroupAction,
  deleteEmailGroupAction,
} from "@/actions/email-group-actions";

interface Group {
  id: number;
  name: string;
  description: string | null;
  member_count: number;
  created_at: string;
}

interface EmailGroupsClientProps {
  groups: Group[];
}

export default function EmailGroupsClient({ groups }: EmailGroupsClientProps) {
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Email Groups
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Organize customer contact IDs into targeted subscriber segments
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition"
        >
          + Create Email Group
        </button>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-zinc-900 p-12 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-500">
            No email groups created yet. Click "+ Create Email Group" to get started.
          </div>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Link
                    href={`/dashboard/email-groups/${group.id}`}
                    className="font-bold text-lg text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  >
                    {group.name}
                  </Link>
                  <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full">
                    {group.member_count} members
                  </span>
                </div>
                <p className="text-sm text-zinc-500 line-clamp-2">
                  {group.description || "No description provided."}
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-400">
                  Created {new Date(group.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/email-groups/${group.id}`}
                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold rounded-lg hover:bg-zinc-200 transition"
                  >
                    View Members
                  </Link>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold rounded-lg hover:bg-rose-100 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

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
