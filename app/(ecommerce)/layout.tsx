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
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000",
    title: {
      default: meta.title ?? config.name,
      template: `%s | ${meta.title ?? config.name}`,
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

  const themeConfig = (config.theme_config ?? {}) as Record<string, string>;
  const bgColor = themeConfig.bg_color || "#ffffff";
  const fgColor = themeConfig.fg_color || "#18181b";
  const textColor = themeConfig.text_color || "#09090b";
  const accentColor = themeConfig.accent_color || "#f59e0b";
  const hoverColor = themeConfig.hover_color || "#38bdf8";
  const linkColor = themeConfig.link_color || accentColor;

  const fontFamily = config.font_family || "Inter";

  const colorStyle = `
    :root {
      --font-family-base: '${fontFamily}', sans-serif;
      --background: ${bgColor};
      --foreground: ${textColor};
      --color-primary: ${bgColor};
      --color-secondary: ${fgColor};
      --color-accent: ${accentColor};
      --color-accent-hover: ${hoverColor};
      --color-text-primary: ${textColor};
      --color-link: ${linkColor};
      --theme-bg: ${bgColor};
      --theme-fg: ${fgColor};
      --theme-text: ${textColor};
      --theme-accent: ${accentColor};
      --theme-hover: ${hoverColor};
      --theme-link: ${linkColor};
    }
    body {
      font-family: var(--font-family-base);
    }
    ${config.custom_css ? config.custom_css : ""}
  `;

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full`}
      data-scroll-behavior="smooth"
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: colorStyle }} />
      </head>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
