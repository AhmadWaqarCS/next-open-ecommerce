import Link from "next/link";
import Image from "next/image";
import type { StorefrontConfig, NavCategory } from "@/lib/storefront";
import SearchButton from "./SearchButton";
import MobileMenuToggle from "./MobileMenuToggle";
import CartButton from "./CartButton";
import CartDrawer from "./CartDrawer";
import CartProvider from "./CartProvider";
import { Suspense } from "react";

interface SiteHeaderProps {
  siteConfig: StorefrontConfig;
  navCategories: NavCategory[];
  topbarMessage?: string | null;
}

/**
 * SiteHeader — pure server component.
 *
 * Scroll glassmorphism is driven entirely by CSS scroll-driven animations
 * (defined in ecommerce-style.css). No JS scroll listener needed.
 *
 * Mobile menu uses MobileMenuToggle (client) for the hamburger button state;
 * the drawer itself is controlled via a CSS :has() selector on a hidden checkbox.
 *
 * SearchButton (client) handles the search popover.
 */
export default function SiteHeader({
  siteConfig,
  navCategories,
  topbarMessage,
}: SiteHeaderProps) {
  const logoUrl = siteConfig.light_logo_url; // CSS shows dark logo on scroll via filter

  return (
    <header className="header-root fixed top-0 inset-x-0 z-50">
      {/* ── Promo bar — hides on scroll via CSS ───────────────────────── */}
      {topbarMessage && (
        <div
          id="header-topbar"
          className="header-topbar bg-zinc-900 text-zinc-100 text-xs text-center py-2 tracking-wide px-4"
        >
          <span>{topbarMessage}</span>
        </div>
      )}

      {/* ── Main nav bar ──────────────────────────────────────────────── */}
      <div className="header-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={siteConfig.name}
                  width={120}
                  height={36}
                  // unoptimized
                  className="object-contain max-h-9 w-auto"
                  priority
                />
              ) : (
                <span className="header-logo-text text-xl font-bold tracking-tight transition-colors duration-300">
                  {siteConfig.name}
                </span>
              )}
            </Link>

            {/* Desktop nav */}
            <nav
              className="hidden md:flex items-center gap-6"
              aria-label="Main navigation"
            >
              {navCategories.map((cat) => {
                const hasChildren = cat.children && cat.children.length > 0;
                return hasChildren ? (
                  <div key={cat.slug} className="relative group/menu py-5">
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
                    {/* CSS hover flyout — no JS */}
                    <div className="absolute top-full left-0 w-52 rounded-xl bg-white border border-zinc-200/60 shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-200 z-50 py-2 mt-0">
                      <Link
                        href={`/category/${cat.slug}`}
                        className="block px-4 py-2 text-sm text-zinc-500 font-medium hover:bg-zinc-50 hover:text-zinc-900 transition-colors border-b border-zinc-100 mb-1"
                      >
                        All {cat.name}
                      </Link>
                      {cat.children.map((child) => (
                        <Link
                          key={child.slug}
                          href={`/category/${child.slug}`}
                          className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    className="header-nav-link text-sm font-medium tracking-wide transition-colors duration-300 py-5"
                  >
                    {cat.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              {/* Search — client component */}
              <SearchButton />

              {/* Cart */}
              <Suspense>
                <CartProvider>
                  <CartButton />
                  <CartDrawer />
                </CartProvider>
              </Suspense>

              {/* Mobile hamburger — client component for toggle state only */}
              <MobileMenuToggle />
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile drawer — controlled by MobileMenuToggle via CSS ────── */}
      <div id="mobile-drawer" className="mobile-drawer md:hidden">
        <nav
          className="flex flex-col px-6 py-4 gap-1 divide-y divide-zinc-100/80"
          aria-label="Mobile navigation"
        >
          {navCategories.map((cat) => (
            <div key={cat.slug} className="py-3 first:pt-0 last:pb-0">
              <Link
                href={`/category/${cat.slug}`}
                className="text-zinc-900 font-semibold text-sm hover:text-[var(--color-accent)] transition-colors block"
              >
                {cat.name}
              </Link>
              {cat.children && cat.children.length > 0 && (
                <div className="flex flex-col pl-4 gap-2 mt-2 border-l-2 border-zinc-100">
                  {cat.children.map((child) => (
                    <Link
                      key={child.slug}
                      href={`/category/${child.slug}`}
                      className="text-zinc-500 font-medium text-xs hover:text-zinc-900 transition-colors"
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

      {/* ── Cart Drawer ──────────────────────────────────────────────────── */}
    </header>
  );
}
