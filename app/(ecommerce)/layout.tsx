"use cache";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./ecommerce-style.css";
import SiteHeader from "./_components/SiteHeader";
import SiteFooter from "./_components/SiteFooter";
import { getSiteConfig } from "@/lib/storefront";
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
  cacheTag("layout");
  cacheLife("max");

  const config = await getSiteConfig();

  if (!config) throw new Error("Site config not found.");

  const colorStyle = `
    :root {
      --color-primary: ${config.primary_color};
      --color-secondary: ${config.secondary_color};
      --color-accent: ${config.accent_color};
    }
    ${config.custom_css ? config.custom_css : ""}
  `;

  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: colorStyle }} />
      </head>
      <body className="min-h-full flex flex-col bg-white text-zinc-900 antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
