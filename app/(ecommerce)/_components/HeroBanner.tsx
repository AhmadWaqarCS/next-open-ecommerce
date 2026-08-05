"use cache";

import Link from "next/link";
import { getHeroBannerData } from "@/lib/storefront";
import { cacheLife, cacheTag } from "next/cache";

const heroScopedStyles = `
  @keyframes orb-float {
    0%, 100% { transform: translate(-50%, -50%) scale(1); }
    50% { transform: translate(-50%, -46%) scale(1.08); }
  }
  .hero-orb {
    animation: orb-float 8s ease-in-out infinite;
  }
`;

/**
 * HeroBanner — Home Page First Impression Component.
 * Placed beside `app/(ecommerce)/page.tsx`.
 */
export default async function HeroBanner() {
  cacheTag("hero-banner");
  cacheLife("max");
  const content = await getHeroBannerData();

  const tagline = content?.tagline || "Wear what you love.";
  const description =
    content?.description || "Curated fashion for every occasion.";
  const accentColor = content?.accentColor || "#e8c98e";
  const primaryColor = content?.primaryColor || "#0f0f0f";
  const categories = content?.categories || [];

  const taglineWords = tagline.split(" ");
  const half = Math.ceil(taglineWords.length / 2);
  const firstHalf = taglineWords.slice(0, half).join(" ");
  const secondHalf = taglineWords.slice(half).join(" ");

  return (
    <section
      className="relative flex items-center justify-center min-h-screen overflow-hidden bg-zinc-950"
    >
      <style dangerouslySetInnerHTML={{ __html: heroScopedStyles }} />

      {/* Background Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950/80 to-zinc-950" />

      {/* Subtle Animated Orb */}
      <div
        className="hero-orb absolute top-1/4 left-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accentColor}, transparent 70%)`,
        }}
      />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto py-24">

        {/* Tagline */}
        <h1 className="text-white text-5xl sm:text-7xl font-bold tracking-tighter leading-[0.95] mb-6">
          {firstHalf}
          {secondHalf && (
            <>
              <br />
              <span style={{ color: accentColor }}>{secondHalf}</span>
            </>
          )}
        </h1>

        <p className="text-zinc-300 text-lg sm:text-xl leading-relaxed mb-10 max-w-xl mx-auto">
          {description}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {categories[0] && (
            <Link
              href={`/category/${categories[0].slug}`}
              className="font-semibold px-8 py-3.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: accentColor,
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

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-500">
        <span className="text-[10px] uppercase tracking-[0.25em]">Scroll</span>
        <div className="w-px h-8 bg-zinc-600 animate-pulse" />
      </div>
    </section>
  );
}
