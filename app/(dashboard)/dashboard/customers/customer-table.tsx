"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import GlobalFilterBar, { CustomFilterConfig } from "@/app/(dashboard)/_components/global-filter-bar";
import { CRUD } from "@/lib/types";
import { CustomerFilterParams } from "@/lib/filters/customer-filters";
import {
  bulkAddCustomersToGroupAction,
  bulkAddCustomersToCampaignAction,
} from "@/actions/customer-contact-actions";

export interface SerializedCustomerContact {
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
  created_at: string;
}

interface CustomerTableProps {
  contacts: SerializedCustomerContact[];
  filterParams: CustomerFilterParams;
  permissions: CRUD;
  totalCount: number;
  groups?: { id: number; name: string }[];
  campaigns?: { id: number; name: string }[];
}

export default function CustomerTable({
  contacts,
  filterParams,
  permissions,
  totalCount,
  groups = [],
  campaigns = [],
}: CustomerTableProps) {
  const router = useRouter();

  // Modal State for the 4 Bulk Action Buttons
  const [activeModal, setActiveModal] = useState<
    "existing_group" | "new_group" | "existing_campaign" | "new_campaign" | null
  >(null);

  const [selectedGroup, setSelectedGroup] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [newCampaignName, setNewCampaignName] = useState("");

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleExecuteGroupAdd = async (
    targetContactIds: number[],
    clearFn: () => void,
  ) => {
    setLoading(true);
    const res = await bulkAddCustomersToGroupAction({
      group_id: selectedGroup ? Number(selectedGroup) : undefined,
      new_group_name: newGroupName || undefined,
      contact_ids: targetContactIds,
    });
    setLoading(false);

    if (res.success) {
      showToast(res.message || "Contacts added to group.");
      setActiveModal(null);
      setSelectedGroup("");
      setNewGroupName("");
      clearFn();
      router.refresh();
    } else {
      showToast(res.message || "Failed to add contacts to group.", "error");
    }
  };

  const handleExecuteCampaignAdd = async (
    targetContactIds: number[],
    clearFn: () => void,
  ) => {
    setLoading(true);
    const res = await bulkAddCustomersToCampaignAction({
      campaign_id: selectedCampaign ? Number(selectedCampaign) : undefined,
      new_campaign_name: newCampaignName || undefined,
      contact_ids: targetContactIds,
    });
    setLoading(false);

    if (res.success) {
      showToast(res.message || "Contacts added to campaign.");
      setActiveModal(null);
      setSelectedCampaign("");
      setNewCampaignName("");
      clearFn();
      if (res.campaignId) {
        router.push(`/dashboard/email-campaigns/${res.campaignId}`);
      } else {
        router.refresh();
      }
    } else {
      showToast(res.message || "Failed to add contacts to campaign.", "error");
    }
  };

  const customFilters: CustomFilterConfig[] = [
    {
      key: "is_customer",
      label: "Customer Status",
      type: "select",
      options: [
        { label: "All Contacts", value: "" },
        { label: "Purchased Customer", value: "true" },
        { label: "Non-Customer", value: "false" },
      ],
      isPrimary: true,
    },
    {
      key: "is_newsletter",
      label: "Newsletter Subscription",
      type: "select",
      options: [
        { label: "All Contacts", value: "" },
        { label: "Newsletter Subscriber", value: "true" },
        { label: "Not Subscribed", value: "false" },
      ],
      isPrimary: true,
    },
    {
      key: "is_unsubscribed",
      label: "Opt-Out Status",
      type: "select",
      options: [
        { label: "All Statuses", value: "" },
        { label: "Active Contacts", value: "false" },
        { label: "Unsubscribed Contacts", value: "true" },
      ],
      isPrimary: true,
    },
    {
      key: "min_spent",
      label: "Min Spent ($)",
      type: "number",
      placeholder: "e.g. 50",
    },
    {
      key: "max_spent",
      label: "Max Spent ($)",
      type: "number",
      placeholder: "e.g. 500",
    },
    {
      key: "min_orders",
      label: "Min Orders",
      type: "number",
      placeholder: "e.g. 2",
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

  const columns: ColumnDef<SerializedCustomerContact>[] = [
    {
      header: "Contact Identity",
      render: (item) => {
        const fullName = [item.first_name, item.last_name].filter(Boolean).join(" ");
        return (
          <div>
            <Link
              href={`/dashboard/customers/${item.id}`}
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {fullName || item.email}
            </Link>
            {fullName && <div className="text-xs text-zinc-500">{item.email}</div>}
            {item.phone && <div className="text-[11px] text-zinc-400">📞 {item.phone}</div>}
          </div>
        );
      },
    },
    {
      header: "Segment Types",
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.is_customer && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300">
              Buyer / Customer
            </span>
          )}
          {item.is_newsletter && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
              Newsletter
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Subscription Status",
      render: (item) =>
        item.is_unsubscribed ? (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            Unsubscribed
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            Subscribed (Active)
          </span>
        ),
    },
    {
      header: "Orders & Spend",
      render: (item) => (
        <div>
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
            ${item.total_spent.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-500">{item.total_orders} orders placed</div>
        </div>
      ),
    },
    {
      header: "Created Date",
      render: (item) => (
        <div className="text-xs text-zinc-500">
          {new Date(item.created_at).toLocaleDateString()}
        </div>
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
        title="Customers & Contacts"
        description="Unified customer directory of buyers and newsletter subscribers"
        permissions={permissions}
        data={contacts}
        totalCount={totalCount}
        columns={columns}
        filterBar={
          <GlobalFilterBar
            searchKey="search"
            searchPlaceholder="Search contacts by name, email or phone..."
            currentFilters={filterParams as Record<string, string | undefined>}
            customFilters={customFilters}
          />
        }
        renderBulkActions={(selectedIds, selectAllScope, clearSelection) => (
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Add to Existing Group */}
            <button
              type="button"
              onClick={() => setActiveModal("existing_group")}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
            >
              + Add to Existing Group
            </button>

            {/* 2. Create New Group */}
            <button
              type="button"
              onClick={() => setActiveModal("new_group")}
              className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-900 text-white text-xs font-bold rounded-lg transition"
            >
              + Create New Group
            </button>

            {/* 3. Add to Existing Campaign */}
            <button
              type="button"
              onClick={() => setActiveModal("existing_campaign")}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition"
            >
              + Add to Existing Campaign
            </button>

            {/* 4. Create New Campaign */}
            <button
              type="button"
              onClick={() => setActiveModal("new_campaign")}
              className="px-3 py-1.5 bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold rounded-lg transition"
            >
              + Create New Campaign
            </button>

            {/* Active Modal Dialogs */}
            {activeModal === "existing_group" && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 text-left">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Add {selectedIds.length} Contact(s) to Existing Group
                  </h3>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">
                      Select Email Group
                    </label>
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                    >
                      <option value="">-- Choose Group --</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={loading || !selectedGroup}
                      onClick={() => handleExecuteGroupAdd(selectedIds, clearSelection)}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
                    >
                      {loading ? "Adding..." : "Add to Group"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeModal === "new_group" && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 text-left">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Create New Group & Add {selectedIds.length} Contact(s)
                  </h3>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">
                      New Group Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Summer Sale Audience"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={loading || !newGroupName.trim()}
                      onClick={() => handleExecuteGroupAdd(selectedIds, clearSelection)}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
                    >
                      {loading ? "Creating..." : "Create & Add"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeModal === "existing_campaign" && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 text-left">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Add {selectedIds.length} Contact(s) to Existing Campaign
                  </h3>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">
                      Select Draft Campaign
                    </label>
                    <select
                      value={selectedCampaign}
                      onChange={(e) => setSelectedCampaign(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                    >
                      <option value="">-- Choose Draft Campaign --</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={loading || !selectedCampaign}
                      onClick={() => handleExecuteCampaignAdd(selectedIds, clearSelection)}
                      className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition"
                    >
                      {loading ? "Adding..." : "Add & Open Campaign"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeModal === "new_campaign" && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 text-left">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Create New Campaign & Add {selectedIds.length} Contact(s)
                  </h3>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">
                      New Campaign Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. August Promotional Announcement"
                      value={newCampaignName}
                      onChange={(e) => setNewCampaignName(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={loading || !newCampaignName.trim()}
                      onClick={() => handleExecuteCampaignAdd(selectedIds, clearSelection)}
                      className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition"
                    >
                      {loading ? "Creating..." : "Create & Edit Campaign"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        renderActions={(item) => (
          <Link
            href={`/dashboard/customers/${item.id}`}
            className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs rounded-lg transition-all"
          >
            View Profile
          </Link>
        )}
        emptyState={{
          title: "No Contacts Found",
          description: "No customer contacts match your filter parameters.",
        }}
      />
    </div>
  );
}
