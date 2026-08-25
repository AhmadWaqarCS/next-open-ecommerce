import Link from "next/link";
import type { HeroBannerProps, ShopCategory } from "@/lib/storefront";

const heroScopedStyles = `
  @keyframes orb-float {
    0%, 100% { transform: translate(-50%, -50%) scale(1); }
    50% { transform: translate(-50%, -46%) scale(1.08); }
  }
  .hero-orb {
    animation: orb-float 8s ease-in-out infinite;
  }
`;

// ─── Default Tailwind class slots ─────────────────────────────────────────────
// These are the base classes used when no classOverrides are set in the DB.
export const HERO_BANNER_DEFAULT_CLASSES = {
  section:
    "relative flex items-center justify-center min-h-screen overflow-hidden bg-zinc-950",
  overlay: "absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950/80 to-zinc-950",
  orbWrapper:
    "hero-orb absolute top-1/4 left-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl pointer-events-none",
  content: "relative z-10 text-center px-4 max-w-4xl mx-auto py-24",
  headline: "text-white text-5xl sm:text-7xl font-bold tracking-tighter leading-[0.95] mb-6",
  description: "text-zinc-300 text-lg sm:text-xl leading-relaxed mb-10 max-w-xl mx-auto",
  ctaRow: "flex flex-col sm:flex-row gap-4 justify-center",
  ctaPrimary:
    "font-semibold px-8 py-3.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95",
  ctaSecondary:
    "border border-white/30 hover:bg-white/10 text-white font-medium px-8 py-3.5 rounded-full transition-all duration-200 hover:border-white/60",
  scrollIndicator:
    "absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-500",
  scrollLabel: "text-[10px] uppercase tracking-[0.25em]",
  scrollLine: "w-px h-8 bg-zinc-600 animate-pulse",
} as const;

export type HeroBannerClassSlot = keyof typeof HERO_BANNER_DEFAULT_CLASSES;

// Merge default classes with any overrides from DB props
function cls(
  slot: HeroBannerClassSlot,
  overrides: Record<string, string> | undefined,
): string {
  return overrides?.[slot] ?? HERO_BANNER_DEFAULT_CLASSES[slot];
}

export interface HeroBannerComponentProps {
  heroBannerProps: HeroBannerProps;
  /** Home categories (show_in_home=true), used for CTA buttons */
  homeCategories: ShopCategory[];
}

/**
 * HeroBanner — Home Page First Impression Component.
 * Data is passed from `app/(ecommerce)/page.tsx` via `getHomePageData()`.
 * No internal DB call. No `"use cache"` — the parent page handles caching.
 */
export default function HeroBanner({
  heroBannerProps,
  homeCategories,
}: HeroBannerComponentProps) {
  const {
    tagline = "Wear what you love.",
    description = "Curated fashion for every occasion.",
    accentColor = "#e8c98e",
    primaryColor = "#0f0f0f",
    ctaCategory1Slug,
    ctaCategory2Slug,
    classOverrides,
  } = heroBannerProps;

  // CTA category resolution: prefer explicit slug overrides, fall back to
  // first two show_in_home categories by sort_order
  const cta1 =
    homeCategories.find((c) => c.slug === ctaCategory1Slug) ??
    homeCategories[0] ??
    null;
  const cta2 =
    homeCategories.find((c) => c.slug === ctaCategory2Slug) ??
    homeCategories[1] ??
    null;

  const taglineWords = tagline.split(" ");
  const half = Math.ceil(taglineWords.length / 2);
  const firstHalf = taglineWords.slice(0, half).join(" ");
  const secondHalf = taglineWords.slice(half).join(" ");

  const overrides = classOverrides as Record<string, string> | undefined;

  return (
    <section className={cls("section", overrides)}>
      <style dangerouslySetInnerHTML={{ __html: heroScopedStyles }} />

      {/* Background Gradient Overlay */}
      <div className={cls("overlay", overrides)} />

      {/* Subtle Animated Orb */}
      <div
        className={cls("orbWrapper", overrides)}
        style={{
          background: `radial-gradient(circle, ${accentColor}, transparent 70%)`,
        }}
      />

      <div className={cls("content", overrides)}>
        {/* Tagline */}
        <h1 className={cls("headline", overrides)}>
          {firstHalf}
          {secondHalf && (
            <>
              <br />
              <span style={{ color: accentColor }}>{secondHalf}</span>
            </>
          )}
        </h1>

        <p className={cls("description", overrides)}>{description}</p>

        {/* CTA Buttons */}
        <div className={cls("ctaRow", overrides)}>
          {cta1 && (
            <Link
              href={`/category/${cta1.slug}`}
              className={cls("ctaPrimary", overrides)}
              style={{ background: accentColor, color: primaryColor }}
            >
              Shop {cta1.name}
            </Link>
          )}
          {cta2 && (
            <Link
              href={`/category/${cta2.slug}`}
              className={cls("ctaSecondary", overrides)}
            >
              Shop {cta2.name}
            </Link>
          )}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className={cls("scrollIndicator", overrides)}>
        <span className={cls("scrollLabel", overrides)}>Scroll</span>
        <div className={cls("scrollLine", overrides)} />
      </div>
    </section>
  );
}
