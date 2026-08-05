"use cache";

import Link from "next/link";
import { getFooterData, type FooterData } from "@/lib/storefront";
import NewsletterForm from "./NewsletterForm";
import { cacheLife, cacheTag } from "next/cache";

export interface SiteFooterProps {
  content: FooterData;
}

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
};

const CUSTOMER_CARE_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Order Cancellation", href: "/order-cancellation-policy" },
  { label: "Return & Refund Policy", href: "/return-and-refund-policy" },
];

const LEGAL_POLICY_LINKS = [
  { label: "Shipping Policy", href: "/shipping-policy" },
  { label: "Payment Policy", href: "/payment-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "Legal Disclaimer", href: "/legal-disclaimer" },
];

const BOTTOM_BAR_LINKS = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Cookie Policy", href: "/cookie-policy" },
];

const footerScopedStyles = `
  .footer-social-btn {
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .footer-link {
    transition: color 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }
`;

/**
 * SiteFooter — Consolidated Dynamic Semantic Footer Component.
 *
 * Micro data fetched dynamically from DB via `getFooterData()`.
 * Organized cleanly into Shop, Customer Care, Legal Policies, and Newsletter,
 * with concise, non-overlapping bottom bar legal links and dynamic payment badges.
 */
export default async function SiteFooter() {
  cacheTag("site-footer");
  cacheLife("max");

  const content = await getFooterData();
  const siteName = content?.siteConfig?.name || "Store";
  const description =
    content?.siteConfig?.description ||
    "Discover high-quality products at unbeatable prices.";
  const email = content?.siteConfig?.email || null;
  const phone = content?.siteConfig?.phone || null;
  const address = content?.siteConfig?.address || null;
  const socialLinks = content?.socialLinks || {};
  const currencySymbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";
  const shopCategories = content?.categories || [];
  const shippingMethods = content?.shippingMethods || [];
  const paymentMethods = content?.paymentMethods || [];

  const socialEntries = Object.entries(socialLinks).filter(
    ([key, url]) => url && key in SOCIAL_ICONS,
  ) as [string, string][];

  const currentYear = "2026"; // new Date().getFullYear();

  return (
    <footer className="bg-zinc-950 text-zinc-400">
      <style dangerouslySetInnerHTML={{ __html: footerScopedStyles }} />

      {/* ── Shipping Methods & Value Proposition Strip (Dynamic DB) ───────── */}
      {shippingMethods.length > 0 && (
        <div className="border-b border-zinc-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {shippingMethods.map((opt) => (
                <div
                  key={opt.id || opt.name}
                  className="flex items-start gap-3"
                >
                  <div className="mt-0.5 text-[var(--color-accent)] shrink-0">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.75}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 7h12m0 0l-4-4m4 4l-4 4M4 17H4m0 0l4 4M4 17l4-4"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 11l2-2m0 0l7-7 7 7M5 9v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">
                      {opt.name}
                    </p>
                    {opt.description && (
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {opt.description}
                      </p>
                    )}
                    {opt.price === 0 ? (
                      <p className="text-[var(--color-accent)] text-xs font-medium mt-0.5">
                        Free Shipping
                        {opt.free_over !== null &&
                          opt.free_over > 0 &&
                          ` on orders over ${currencySymbol}${opt.free_over}`}
                      </p>
                    ) : (
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {currencySymbol}
                        {opt.price.toFixed(2)}
                        {opt.free_over !== null &&
                          ` · Free over ${currencySymbol}${opt.free_over}`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Footer Columns & Links ─────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-6 gap-8 sm:gap-10">
        {/* Brand, Info & Social Links */}
        <div className="md:col-span-2 flex flex-col gap-5">
          <Link
            href="/"
            className="text-white text-xl font-bold tracking-tight"
          >
            {siteName}
          </Link>

          <p className="text-zinc-500 text-sm leading-relaxed max-w-xs line-clamp-3">
            {description}
          </p>

          {/* Contact Details */}
          <div className="flex flex-col gap-2 text-xs text-zinc-500">
            {email && (
              <a
                href={`mailto:${email}`}
                className="hover:text-zinc-300 transition-colors truncate"
              >
                {email}
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="hover:text-zinc-300 transition-colors"
              >
                {phone}
              </a>
            )}
            {address && <p className="leading-snug">{address}</p>}
          </div>

          {/* Social Media Links */}
          {socialEntries.length > 0 && (
            <div className="flex gap-3 mt-1">
              {socialEntries.map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={
                    platform.charAt(0).toUpperCase() + platform.slice(1)
                  }
                  className="footer-social-btn w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  {SOCIAL_ICONS[platform]}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Shop Categories Column (Dynamic DB) */}
        <div>
          <h3 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">
            Shop
          </h3>
          <ul className="flex flex-col gap-2.5">
            {shopCategories.map((cat) => (
              <li key={cat.slug}>
                <Link
                  href={`/category/${cat.slug}`}
                  className="footer-link text-zinc-500 hover:text-zinc-200 text-sm"
                >
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Customer Care Column */}
        <div>
          <h3 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">
            Customer Care
          </h3>
          <ul className="flex flex-col gap-2.5">
            {CUSTOMER_CARE_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="footer-link text-zinc-500 hover:text-zinc-200 text-sm"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal & Policies Column */}
        <div>
          <h3 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">
            Legal & Policies
          </h3>
          <ul className="flex flex-col gap-2.5">
            {LEGAL_POLICY_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="footer-link text-zinc-500 hover:text-zinc-200 text-sm"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Newsletter Subscription Column */}
        <div>
          <h3 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">
            Stay Connected
          </h3>
          <p className="text-zinc-500 text-xs mb-3">
            Subscribe for exclusive offers and update notifications.
          </p>
          <NewsletterForm />
        </div>
      </div>

      {/* ── Bottom Bar & Dynamic Payment Badges ──────────────────────────── */}
      <div className="border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <span>
            © {currentYear} {siteName}. All rights reserved.
          </span>

          {/* Clean, Non-Crowded Primary Legal Links */}
          <div className="flex gap-5 flex-wrap justify-center">
            {BOTTOM_BAR_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="hover:text-zinc-400 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Dynamic DB Payment Method Badges */}
          <div
            className="flex items-center gap-1.5 flex-wrap"
            aria-label="Accepted payment methods"
          >
            {paymentMethods.length > 0
              ? paymentMethods.map((method) => (
                  <span
                    key={method.id}
                    className="bg-zinc-900 text-zinc-400 border border-zinc-800 rounded px-2 py-0.5 text-[10px] font-bold tracking-wide"
                  >
                    {method.name}
                  </span>
                ))
              : ["Cash on Delivery"].map((method) => (
                  <span
                    key={method}
                    className="bg-zinc-900 text-zinc-400 border border-zinc-800 rounded px-2 py-0.5 text-[10px] font-bold tracking-wide"
                  >
                    {method}
                  </span>
                ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
