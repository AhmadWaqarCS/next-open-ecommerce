"use cache";

import type { Metadata } from "next";
import { getCheckoutPageData } from "@/lib/storefront";
import CheckoutForm from "./CheckoutForm";
import { Suspense } from "react";
import CartProvider from "../_components/CartProvider";
import { cacheLife, cacheTag } from "next/cache";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  cacheTag("checkout");
  cacheLife("max");

  const { shippingMethods, paymentMethods, checkoutConfig } =
    await getCheckoutPageData();

  if (!checkoutConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Store configuration not found.</p>
      </div>
    );
  }

  return (
    <div className="page-enter">
      {/* Dark banner */}
      <div className="bg-zinc-950 relative overflow-hidden border-b border-zinc-800/40">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900/30 to-zinc-950" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Checkout
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Complete your order securely
          </p>
        </div>
      </div>
      <Suspense>
        <CartProvider>
          <CheckoutForm
            config={checkoutConfig}
            shippingMethods={shippingMethods}
            paymentMethods={paymentMethods}
          />
        </CartProvider>
      </Suspense>
    </div>
  );
}
