import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/storefront";
import OrderSearchForm from "./OrderSearchForm";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const storeName = config?.name || "Store";
  return {
    title: `Track & Manage Your Order — ${storeName}`,
    description: "Enter your order number to check order status, delivery tracking, view invoices, or cancel an order.",
    robots: { index: true, follow: true },
  };
}

export default async function OrderSearchPage() {
  const config = await getSiteConfig();
  const storeName = config?.name || "Store";

  return (
    <div className="min-h-[75vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 page-enter bg-zinc-50/50">
      <div className="max-w-md w-full mx-auto space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-zinc-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-zinc-900/10">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Track & Manage Order</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Enter your order number to view real-time delivery status, access your official invoice, or request order cancellation.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-zinc-200/80 shadow-xl shadow-zinc-950/5">
          <OrderSearchForm storeName={storeName} />
        </div>
      </div>
    </div>
  );
}
