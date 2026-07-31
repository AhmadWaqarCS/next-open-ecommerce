"use cache";

import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getShopCategoriesWithCount, getSiteConfig } from "@/lib/storefront";
import FeaturedProducts from "./_components/FeaturedProducts";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  if (!config) return {};
  const meta = config.meta_info;
  return {
    title: meta.title ?? config.name,
    description: meta.description ?? config.description ?? undefined,
  };
}

export default async function EcommerceHomePage() {
  cacheTag("categories", "shop-categories");
  cacheLife("max");

  const [categories, config] = await Promise.all([
    getShopCategoriesWithCount(),
    getSiteConfig(),
  ]);

  if (!config) throw new Error("No site config found");

  const currencySymbol = config.currency_symbol;

  return (
    <div className="page-enter">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative flex items-center justify-center min-h-screen bg-[var(--color-primary)] overflow-hidden">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-[var(--color-primary)]" />

        {/* Subtle animated orb */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
          style={{
            background: `radial-gradient(circle, ${config.accent_color}, transparent 70%)`,
          }}
        />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          {/* Label */}
          {config.home_tagline_label && (
            <p
              className="text-xs font-semibold uppercase tracking-[0.3em] mb-6"
              style={{ color: config.accent_color }}
            >
              {config.home_tagline_label}
            </p>
          )}

          {/* Tagline */}
          <h1 className="text-white text-5xl sm:text-7xl font-bold tracking-tighter leading-[0.95] mb-6">
            {config.tagline ? (
              (() => {
                const words = config.tagline.split(" ");
                const half = Math.ceil(words.length / 2);
                return (
                  <>
                    {words.slice(0, half).join(" ")}
                    <br />
                    <span style={{ color: config.accent_color }}>
                      {words.slice(half).join(" ")}
                    </span>
                  </>
                );
              })()
            ) : (
              <>
                Wear what
                <br />
                <span style={{ color: config.accent_color }}>you love.</span>
              </>
            )}
          </h1>

          <p className="text-zinc-300 text-lg sm:text-xl leading-relaxed mb-10 max-w-xl mx-auto">
            {config.description ?? "Curated fashion for every occasion."}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {categories[0] && (
              <Link
                href={`/category/${categories[0].slug}`}
                className="font-semibold px-8 py-3.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: config.accent_color,
                  color: "#09090b",
                }}
              >
                Shop {categories[0].name}
              </Link>
            )}
            {categories[1] && (
              <Link
                href={`/category/${categories[1].slug}`}
                className="border border-white/30 hover:bg-white/10 text-white font-medium px-8 py-3.5 rounded-full transition-all duration-200 hover:border-white/60"
              >
                Shop {categories[1].name}
              </Link>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-500">
          <span className="text-[10px] uppercase tracking-[0.25em]">
            Scroll
          </span>
          <div className="w-px h-8 bg-zinc-600 animate-pulse" />
        </div>
      </section>

      {/* ── Category grid ─────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-8">
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((cat) => {
              const bgClass = cat.bg_color?.includes("bg-")
                ? cat.bg_color
                : `bg-gradient-to-br ${cat.bg_color ?? "from-zinc-800 to-zinc-950"}`;
              return (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className={`${bgClass} rounded-2xl aspect-square flex flex-col items-start justify-end p-5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group overflow-hidden relative shadow-sm`}
                >
                  {cat.image_url && (
                    <Image
                      src={cat.image_url}
                      alt={cat.name}
                      fill
                      // unoptimized
                      className="object-cover opacity-40 group-hover:opacity-50 transition-opacity"
                      sizes="(max-width: 768px) 50vw, 20vw"
                    />
                  )}
                  <div className="relative z-10">
                    <span className="text-white font-semibold text-base group-hover:underline block">
                      {cat.name}
                    </span>
                    {cat.product_count > 0 && (
                      <span className="text-white/60 text-xs">
                        {cat.product_count} items
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Featured Products ──────────────────────────────────────────────── */}
      <FeaturedProducts title="Featured" viewAllHref="/products" limit={8} />

      {/* ── Value propositions ────────────────────────────────────────────── */}
      <section className="bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 sm:grid-cols-3 gap-10">
          {[
            {
              icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
              title: "Free Returns",
              desc: "Easy 30-day returns. No questions asked.",
            },
            {
              icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
              title: "Secure Checkout",
              desc: "256-bit SSL encryption on every order.",
            },
            {
              icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z",
              title: "24/7 Support",
              desc: "We're here whenever you need us.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex flex-col items-center text-center gap-3"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: `color-mix(in srgb, ${config.accent_color} 15%, transparent)`,
                }}
              >
                <svg
                  className="w-5 h-5"
                  style={{ color: config.accent_color }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={item.icon}
                  />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-zinc-900">
                {item.title}
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
