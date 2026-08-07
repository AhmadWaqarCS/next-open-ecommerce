"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  unsubscribeCustomerContactAction,
  resubscribeCustomerContactAction,
  bulkAddCustomersToGroupAction,
  bulkAddCustomersToCampaignAction,
} from "@/actions/customer-contact-actions";

interface Contact {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_customer: boolean;
  is_newsletter: boolean;
  is_unsubscribed: boolean;
  total_spent: number;
  total_orders: number;
  total_quantity: number;
  categories_bought: string[];
  locations: string[];
  created_at: string;
}

interface Group {
  id: number;
  name: string;
  member_count: number;
}

interface Campaign {
  id: number;
  name: string;
  total_recipients: number;
}

interface CustomersClientProps {
  contacts: Contact[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  groups: Group[];
  draftCampaigns: Campaign[];
  query: string;
  status: string;
  minSpent?: number;
}

export default function CustomersClient({
  contacts,
  totalCount,
  currentPage,
  totalPages,
  groups,
  draftCampaigns,
  query,
  status,
  minSpent,
}: CustomersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState(query);
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [spentThreshold, setSpentThreshold] = useState(minSpent?.toString() || "");

  // Group Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState("");
  const [groupLoading, setGroupLoading] = useState(false);

  // Campaign Modal State
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [newCampaignName, setNewCampaignName] = useState("");
  const [campaignLoading, setCampaignLoading] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm) params.set("query", searchTerm);
    else params.delete("query");

    if (selectedStatus && selectedStatus !== "all") params.set("status", selectedStatus);
    else params.delete("status");

    if (spentThreshold) params.set("min_spent", spentThreshold);
    else params.delete("min_spent");

    params.set("page", "1");
    router.push(`/dashboard/customers?${params.toString()}`);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(contacts.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleUnsubscribe = async (id: number) => {
    const res = await unsubscribeCustomerContactAction(id);
    if (res.success) {
      showToast("Customer unsubscribed.");
      router.refresh();
    } else {
      showToast(res.message || "Action failed.", "error");
    }
  };

  const handleResubscribe = async (id: number) => {
    const res = await resubscribeCustomerContactAction(id);
    if (res.success) {
      showToast("Customer resubscribed.");
      router.refresh();
    } else {
      showToast(res.message || "Action failed.", "error");
    }
  };

  const handleAddToGroupSubmit = async () => {
    if (selectedIds.length === 0) return;
    setGroupLoading(true);

    const formData = {
      group_id: selectedGroupId ? Number(selectedGroupId) : undefined,
      new_group_name: newGroupName.trim() || undefined,
      contact_ids: selectedIds,
    };

    const res = await bulkAddCustomersToGroupAction(formData);
    setGroupLoading(false);

    if (res.success) {
      showToast(res.message || "Added to group!");
      setIsGroupModalOpen(false);
      setSelectedIds([]);
      router.refresh();
    } else {
      showToast(res.message || "Failed to add to group.", "error");
    }
  };

  const handleAddToCampaignSubmit = async () => {
    if (selectedIds.length === 0) return;
    setCampaignLoading(true);

    const data = {
      campaign_id: selectedCampaignId ? Number(selectedCampaignId) : undefined,
      new_campaign_name: newCampaignName.trim() || undefined,
      contact_ids: selectedIds,
    };

    const res = await bulkAddCustomersToCampaignAction(data);
    setCampaignLoading(false);

    if (res.success) {
      showToast(res.message || "Added to campaign!");
      setIsCampaignModalOpen(false);
      setSelectedIds([]);
      if (res.campaignId) {
        router.push(`/dashboard/email-campaigns/${res.campaignId}`);
      } else {
        router.refresh();
      }
    } else {
      showToast(res.message || "Failed to add to campaign.", "error");
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Customers & Email Contacts
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Unified analytical directory of buyers and newsletter subscribers ({totalCount} total)
          </p>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-4 py-2 rounded-xl">
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {selectedIds.length} selected
            </span>
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition"
            >
              + Add to Group
            </button>
            <button
              onClick={() => setIsCampaignModalOpen(true)}
              className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition"
            >
              + Add to Campaign
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none"
        >
          <option value="all">All Contacts</option>
          <option value="customer">Customers (Placed Orders)</option>
          <option value="newsletter">Newsletter Subscribers</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>

        <input
          type="number"
          placeholder="Min Spent ($)"
          value={spentThreshold}
          onChange={(e) => setSpentThreshold(e.target.value)}
          className="w-36 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none"
        />

        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-800 transition"
        >
          Filter
        </button>
      </div>

      {/* Contacts Data Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={contacts.length > 0 && selectedIds.length === contacts.length}
                    onChange={handleSelectAll}
                    className="rounded border-zinc-300 dark:border-zinc-700"
                  />
                </th>
                <th className="p-4">Customer Contact</th>
                <th className="p-4">Status & Type</th>
                <th className="p-4">Orders & Spent</th>
                <th className="p-4">Categories</th>
                <th className="p-4">Locations</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-900 dark:text-zinc-100">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    No customer contacts match your filter criteria.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => {
                  const fullName = [contact.first_name, contact.last_name]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr
                      key={contact.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(contact.id)}
                          onChange={() => handleToggleSelect(contact.id)}
                          className="rounded border-zinc-300 dark:border-zinc-700"
                        />
                      </td>
                      <td className="p-4">
                        <Link
                          href={`/dashboard/customers/${contact.id}`}
                          className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {fullName || contact.email}
                        </Link>
                        {fullName && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div className="text-xs text-zinc-400">{contact.phone}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {contact.is_customer && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                              Customer
                            </span>
                          )}
                          {contact.is_newsletter && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              Subscriber
                            </span>
                          )}
                          {contact.is_unsubscribed ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                              Unsubscribed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                              Subscribed
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold">
                          ${contact.total_spent.toFixed(2)}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {contact.total_orders} orders ({contact.total_quantity} items)
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {contact.categories_bought.length === 0 ? (
                            <span className="text-xs text-zinc-400">None</span>
                          ) : (
                            contact.categories_bought.slice(0, 2).map((cat) => (
                              <span
                                key={cat}
                                className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-[11px] rounded text-zinc-600 dark:text-zinc-300"
                              >
                                {cat}
                              </span>
                            ))
                          )}
                          {contact.categories_bought.length > 2 && (
                            <span className="text-xs text-zinc-400">
                              +{contact.categories_bought.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-xs text-zinc-500">
                        {contact.locations.join(", ") || "—"}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/customers/${contact.id}`}
                            className="px-2.5 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded font-medium transition"
                          >
                            Details
                          </Link>
                          {contact.is_unsubscribed ? (
                            <button
                              onClick={() => handleResubscribe(contact.id)}
                              className="px-2 py-1 text-xs text-emerald-600 hover:underline"
                            >
                              Opt-in
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnsubscribe(contact.id)}
                              className="px-2 py-1 text-xs text-rose-600 hover:underline"
                            >
                              Opt-out
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-sm text-zinc-500">
            <div>
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", (currentPage - 1).toString());
                  router.push(`/dashboard/customers?${params.toString()}`);
                }}
                className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", (currentPage + 1).toString());
                  router.push(`/dashboard/customers?${params.toString()}`);
                }}
                className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add to Group Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Add {selectedIds.length} Customers to Group
            </h3>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">
                Select Existing Group
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
              >
                <option value="">-- Choose Group --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.member_count} members)
                  </option>
                ))}
              </select>
            </div>

            <div className="text-center text-xs text-zinc-400 font-semibold uppercase">
              or Create New Group
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">
                New Group Name
              </label>
              <input
                type="text"
                placeholder="e.g. VIP High Spenders"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400"
              >
                Cancel
              </button>
              <button
                disabled={groupLoading}
                onClick={handleAddToGroupSubmit}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
              >
                {groupLoading ? "Adding..." : "Add Contacts"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Campaign Modal */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Add {selectedIds.length} Customers to Campaign
            </h3>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">
                Select Existing Draft Campaign
              </label>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
              >
                <option value="">-- Choose Draft Campaign --</option>
                {draftCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.total_recipients} recipients)
                  </option>
                ))}
              </select>
            </div>

            <div className="text-center text-xs text-zinc-400 font-semibold uppercase">
              or Create New Draft Campaign
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">
                New Campaign Name
              </label>
              <input
                type="text"
                placeholder="e.g. Summer Discount Promo"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsCampaignModalOpen(false)}
                className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400"
              >
                Cancel
              </button>
              <button
                disabled={campaignLoading}
                onClick={handleAddToCampaignSubmit}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition"
              >
                {campaignLoading ? "Adding..." : "Add to Campaign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
