"use cache";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./ecommerce-style.css";
import SiteHeader from "./_components/SiteHeader";
import SiteFooter from "./_components/SiteFooter";
import {
  getCategories,
  getSiteConfig,
  getShippingMethods,
} from "@/lib/storefront";
import { cacheLife, cacheTag } from "next/cache";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  if (!config) throw new Error("Site config not found.");
  const meta = config.meta_info;

  const faviconUrl = config.favicon_url || "/favicon.ico";

  return {
    metadataBase:
      config.site_url ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000",
    title: {
      default: meta.title ?? config.name,
      template: `%s | ${config.name}`,
    },
    description: meta.description ?? config.description ?? undefined,
    keywords: meta.keywords ?? undefined,
    icons: {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    },
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      title: meta.title ?? config.name,
      description: meta.description ?? config.description ?? undefined,
      url: "/",
      siteName: config.name,
    },
  };
}

export default async function EcommerceRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  cacheTag("site-config", "categories", "shop-categories", "shipping-methods");
  cacheLife("max");

  const [config, navCategories, shippingMethods] = await Promise.all([
    getSiteConfig(),
    getCategories(),
    getShippingMethods(),
  ]);

  if (!config) throw new Error("Site config not found.");

  // Inject DB colors as CSS custom properties — server-rendered, no client JS needed.
  const colorStyle = `
    :root {
      --color-primary: ${config.primary_color};
      --color-secondary: ${config.secondary_color};
      --color-accent: ${config.accent_color};
    }
  `;

  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: colorStyle }} />
      </head>
      <body className="min-h-full flex flex-col bg-white text-zinc-900 antialiased">
        <div>
          <SiteHeader
            siteConfig={config}
            navCategories={navCategories}
            topbarMessage={config.topbar_message}
          />
          <main className="flex-1 pt-16 -mt-10">{children}</main>
          <SiteFooter
            siteConfig={config}
            shopCategories={navCategories}
            shippingMethods={shippingMethods}
          />
        </div>
      </body>
    </html>
  );
}
