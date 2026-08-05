import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getOrderPageData, getSiteConfig } from "@/lib/storefront";
import OrderPageClient from "./OrderPageClient";

interface OrderPageProps {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ new?: string; action?: string }>;
}

export async function generateMetadata({
  params,
}: OrderPageProps): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Order #${orderNumber} Details & Tracking`,
    robots: { index: false, follow: false },
  };
}

async function OrderContent({ params, searchParams }: OrderPageProps) {
  const { orderNumber } = await params;
  const resolvedSearchParams = await searchParams;

  const [{ order }, siteConfig] = await Promise.all([
    getOrderPageData(orderNumber),
    getSiteConfig(),
  ]);

  if (!order) {
    notFound();
  }

  const currencySymbol = siteConfig?.currency_symbol || process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";
  const storeName = siteConfig?.name || "Our Store";

  const isNewlyPlaced = resolvedSearchParams.new === "1";
  const autoOpenCancel = resolvedSearchParams.action === "cancel";

  return (
    <OrderPageClient
      order={order}
      currencySymbol={currencySymbol}
      storeName={storeName}
      isNewlyPlaced={isNewlyPlaced}
      autoOpenCancel={autoOpenCancel}
    />
  );
}

export default function OrderDetailPage(props: OrderPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen py-16 text-center">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full" />
          <p className="mt-4 text-xs text-zinc-500 font-medium">Loading order details...</p>
        </div>
      }
    >
      <OrderContent {...props} />
    </Suspense>
  );
}
