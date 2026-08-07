"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { removeMemberFromGroupAction } from "@/actions/email-group-actions";

interface Member {
  id: number;
  added_at: string;
  contact: {
    id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
    is_customer: boolean;
    is_newsletter: boolean;
    is_unsubscribed: boolean;
    total_spent: number;
  };
}

interface Group {
  id: number;
  name: string;
  description: string | null;
  member_count: number;
  created_at: string;
}

interface EmailGroupDetailClientProps {
  group: Group;
  members: Member[];
}

export default function EmailGroupDetailClient({
  group,
  members,
}: EmailGroupDetailClientProps) {
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRemoveMember = async (contactId: number) => {
    if (!confirm("Remove this contact from the group?")) return;

    const res = await removeMemberFromGroupAction(group.id, contactId);
    if (res.success) {
      showToast("Member removed from group.");
      router.refresh();
    } else {
      showToast(res.message || "Failed to remove member.", "error");
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
      <div>
        <Link
          href="/dashboard/email-groups"
          className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 mb-2"
        >
          ← Back to Email Groups
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {group.name}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {group.description || "No description provided."} • {members.length} member contacts
            </p>
          </div>

          <Link
            href="/dashboard/customers"
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition"
          >
            + Add Members from Directory
          </Link>
        </div>
      </div>

      {/* Member Contacts Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-4">Customer Contact</th>
                <th className="p-4">Status</th>
                <th className="p-4">Total Spent</th>
                <th className="p-4">Added Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">
                    No member contacts in this group yet. Select customers in the Customer Directory to add them.
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const fullName = [m.contact.first_name, m.contact.last_name]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="p-4">
                        <Link
                          href={`/dashboard/customers/${m.contact.id}`}
                          className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {fullName || m.contact.email}
                        </Link>
                        {fullName && (
                          <div className="text-xs text-zinc-500">{m.contact.email}</div>
                        )}
                      </td>
                      <td className="p-4">
                        {m.contact.is_unsubscribed ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            Unsubscribed (Will be skipped in campaign)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-semibold">
                        ${m.contact.total_spent.toFixed(2)}
                      </td>
                      <td className="p-4 text-xs text-zinc-500">
                        {new Date(m.added_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleRemoveMember(m.contact.id)}
                          className="px-2.5 py-1 text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
