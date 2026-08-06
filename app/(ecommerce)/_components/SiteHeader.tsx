"use cache";

import Link from "next/link";
import Image from "next/image";
import { getHeaderData, type HeaderData } from "@/lib/storefront";
import SearchButton from "./SearchButton";
import MobileMenuToggle from "./MobileMenuToggle";
import CartButton from "./CartButton";
import CartDrawer from "./CartDrawer";
import CartProvider from "./CartProvider";
import { cacheLife, cacheTag } from "next/cache";
import { Suspense } from "react";

export interface SiteHeaderProps {
  content: HeaderData;
}

const headerScopedStyles = `
  @keyframes header-topbar-hide {
    from {
      max-height: 40px;
      opacity: 1;
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
    }
    to {
      max-height: 0;
      opacity: 0;
      padding-top: 0;
      padding-bottom: 0;
      overflow: hidden;
    }
  }

  /* Main Navigation Bar — Solid Black Glassmorphism Header */
  .header-bar {
    background-color: rgba(9, 9, 11, 0.95);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    border-bottom: 1px solid rgba(39, 39, 42, 0.6);
    transition: background-color 200ms ease;
  }

  .header-topbar {
    animation: header-topbar-hide linear both;
    animation-timeline: scroll(root block);
    animation-range: 0px 80px;
    overflow: hidden;
  }

  .header-logo-text {
    color: #ffffff;
  }

  .header-nav-link {
    position: relative;
    color: rgba(255, 255, 255, 0.85);
  }

  .header-nav-link:hover {
    color: #ffffff;
  }

  .header-nav-link::after {
    content: "";
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 0;
    height: 1.5px;
    background: currentColor;
    transition: width 250ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .header-nav-link:hover::after {
    width: 100%;
  }

  .header-icon-btn {
    color: rgba(255, 255, 255, 0.85);
  }

  .header-icon-btn:hover {
    color: #ffffff;
  }

  .mobile-drawer {
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
    background-color: rgba(9, 9, 11, 0.97);
    backdrop-filter: blur(16px) saturate(180%);
    border-top: 1px solid rgba(39, 39, 42, 0.6);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  header[data-mobile-open] .mobile-drawer {
    max-height: 85vh;
    opacity: 1;
    overflow-y: auto;
  }

  header[data-mobile-open] .header-bar {
    background-color: rgba(9, 9, 11, 0.98);
    border-bottom-color: rgba(39, 39, 42, 0.6);
  }
`;

export default async function SiteHeader() {
  cacheTag("site-header");
  cacheLife("max");

  const content = await getHeaderData();
  const siteName = content?.siteName || "Store";
  const logoUrl = content?.lightLogoUrl;
  const topbarMessage = content?.topbarMessage;
  const currencySymbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";
  const navCategories = content?.categories || [];

  const sitePages = content?.sitePages || [];

  return (
    <header className="header-root sticky top-0 z-50 bg-zinc-950">
      {/* Scoped Header Animations & Glassmorphism Styles */}
      <style dangerouslySetInnerHTML={{ __html: headerScopedStyles }} />

      {/* ── Top Announcement Bar ─────────────────────────────────────────── */}
      {topbarMessage && (
        <div
          id="header-topbar"
          className="header-topbar bg-zinc-950 text-zinc-200 text-xs text-center py-2 tracking-wide px-4 font-medium pointer-events-auto border-b border-zinc-800/40"
        >
          <span>{topbarMessage}</span>
        </div>
      )}

      {/* ── Main Navigation Bar ──────────────────────────────────────────── */}
      <div className="header-bar pointer-events-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Store Logo / Brand Name */}
            <Link href="/" className="flex items-center shrink-0">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={siteName}
                  width={120}
                  height={36}
                  className="object-contain max-h-9 w-auto"
                  priority
                />
              ) : (
                <span className="header-logo-text text-xl font-bold tracking-tight transition-colors duration-300">
                  {siteName}
                </span>
              )}
            </Link>

            {/* Desktop Navigation Links */}
            <nav
              className="hidden md:flex items-center gap-6"
              aria-label="Main navigation"
            >
              {navCategories.map((cat) => {
                const hasChildren = cat.children && cat.children.length > 0;
                return hasChildren ? (
                  <div
                    key={cat.slug}
                    className="relative group/menu py-5 flex items-center"
                  >
                    <button className="header-nav-link flex items-center gap-1 text-sm font-medium tracking-wide transition-colors duration-300">
                      {cat.name}
                      <svg
                        className="w-3.5 h-3.5 opacity-60 transition-transform duration-200 group-hover/menu:rotate-180"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    {/* CSS Hover Flyout Menu */}
                    <div className="absolute top-full left-0 w-52 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-200 z-50 py-2 mt-0">
                      <Link
                        href={`/category/${cat.slug}`}
                        className="block px-4 py-2 text-sm text-zinc-400 font-medium hover:bg-zinc-800 hover:text-white transition-colors border-b border-zinc-800/60 mb-1"
                      >
                        All {cat.name}
                      </Link>
                      {cat.children.map((child) => (
                        <Link
                          key={child.slug}
                          href={`/category/${child.slug}`}
                          className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div key={cat.slug} className="py-5 flex items-center">
                    <Link
                      href={`/category/${cat.slug}`}
                      className="header-nav-link text-sm font-medium tracking-wide transition-colors duration-300"
                    >
                      {cat.name}
                    </Link>
                  </div>
                );
              })}
              {sitePages.map((p) => (
                <div key={p.slug} className="py-5 flex items-center">
                  <Link
                    href={`/${p.slug}`}
                    className="header-nav-link text-sm font-medium tracking-wide transition-colors duration-300"
                  >
                    {p.title}
                  </Link>
                </div>
              ))}
            </nav>

            {/* Right Action Icons */}
            <div className="flex items-center gap-3">
              <Suspense>
                <SearchButton />
                <CartProvider>
                  <CartButton />
                  <CartDrawer />
                </CartProvider>
              </Suspense>

              <MobileMenuToggle />
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Navigation Drawer ─────────────────────────────────────── */}
      <div
        id="mobile-drawer"
        className="mobile-drawer md:hidden pointer-events-auto"
      >
        <nav
          className="flex flex-col px-6 py-4 gap-1 divide-y divide-zinc-800/80"
          aria-label="Mobile navigation"
        >
          {navCategories.map((cat) => (
            <div key={cat.slug} className="py-3 first:pt-0 last:pb-0">
              <Link
                href={`/category/${cat.slug}`}
                className="text-white font-semibold text-sm hover:text-[var(--color-accent)] transition-colors block"
              >
                {cat.name}
              </Link>
              {cat.children && cat.children.length > 0 && (
                <div className="flex flex-col pl-4 gap-2 mt-2 border-l-2 border-zinc-800">
                  {cat.children.map((child) => (
                    <Link
                      key={child.slug}
                      href={`/category/${child.slug}`}
                      className="text-zinc-400 font-medium text-xs hover:text-white transition-colors"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </header>
  );
}
