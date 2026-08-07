"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  unsubscribeCustomerContactAction,
  resubscribeCustomerContactAction,
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

interface OrderItem {
  id: number;
  order_number: string;
  total: number;
  payment_status: string;
  fulfillment_status: string;
  currency: string;
  items_count: number;
  placed_at: string;
}

interface CustomerDetailClientProps {
  contact: Contact;
  orders: OrderItem[];
}

export default function CustomerDetailClient({
  contact,
  orders,
}: CustomerDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  const avgOrderValue = contact.total_orders > 0 ? contact.total_spent / contact.total_orders : 0;

  const handleToggleSubscription = async () => {
    setLoading(true);
    if (contact.is_unsubscribed) {
      await resubscribeCustomerContactAction(contact.id);
    } else {
      await unsubscribeCustomerContactAction(contact.id);
    }
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="space-y-8">
      {/* Top Navigation */}
      <div>
        <Link
          href="/dashboard/customers"
          className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 mb-2"
        >
          ← Back to Customer Directory
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {fullName || contact.email}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {contact.email} {contact.phone ? `• ${contact.phone}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSubscription}
              disabled={loading}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                contact.is_unsubscribed
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-200"
              }`}
            >
              {contact.is_unsubscribed ? "Resubscribe Customer" : "Opt-out / Unsubscribe"}
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Total Spent
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
            ${contact.total_spent.toFixed(2)}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Total Orders
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
            {contact.total_orders} orders
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Average Order Value
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
            ${avgOrderValue.toFixed(2)}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Total Purchased Items
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
            {contact.total_quantity} items
          </div>
        </div>
      </div>

      {/* Categories & Location Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Purchased Categories
          </h3>
          <div className="flex flex-wrap gap-2">
            {contact.categories_bought.length === 0 ? (
              <span className="text-sm text-zinc-400">No categories purchased yet.</span>
            ) : (
              contact.categories_bought.map((cat) => (
                <span
                  key={cat}
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-semibold text-indigo-700 dark:text-indigo-300"
                >
                  {cat}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Shipping Locations
          </h3>
          <div className="flex flex-wrap gap-2">
            {contact.locations.length === 0 ? (
              <span className="text-sm text-zinc-400">No shipping locations recorded.</span>
            ) : (
              contact.locations.map((loc) => (
                <span
                  key={loc}
                  className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  📍 {loc}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Past Orders History */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 font-bold text-lg">
          Complete Order History ({orders.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-4">Order Number</th>
                <th className="p-4">Date</th>
                <th className="p-4">Items</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Fulfillment</th>
                <th className="p-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    No orders placed by this contact.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="p-4 font-mono font-bold">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        #{o.order_number}
                      </Link>
                    </td>
                    <td className="p-4 text-zinc-500">
                      {new Date(o.placed_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-zinc-500">{o.items_count} items</td>
                    <td className="p-4">
                      <span className="capitalize text-xs font-semibold px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800">
                        {o.payment_status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="capitalize text-xs font-semibold px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800">
                        {o.fulfillment_status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold">
                      ${o.total.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
