"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

interface CategoryCarouselClientProps {
  children: React.ReactNode;
  title: string;
  viewAllHref?: string;
  autoScrollInterval?: number; // In milliseconds, default 4000ms
}

export default function CategoryCarouselClient({
  children,
  title,
  viewAllHref,
  autoScrollInterval = 4000,
}: CategoryCarouselClientProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    checkScroll();

    const handleResize = () => checkScroll();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [checkScroll]);

  const scrollBy = useCallback((direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const amount = clientWidth * 0.85;

    if (direction === "right") {
      // Loop back to start if reached the end
      if (scrollLeft >= scrollWidth - clientWidth - 10) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: amount, behavior: "smooth" });
      }
    } else {
      if (scrollLeft <= 5) {
        el.scrollTo({ left: scrollWidth, behavior: "smooth" });
      } else {
        el.scrollBy({ left: -amount, behavior: "smooth" });
      }
    }
  }, []);

  // ── Auto Play / Interval Timer ─────────────────────────────────────────────
  useEffect(() => {
    if (!autoScrollInterval || isHovered) return;

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        scrollBy("right");
      }
    }, autoScrollInterval);

    return () => clearInterval(timer);
  }, [autoScrollInterval, isHovered, scrollBy]);

  return (
    <div
      className="w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Carousel Header & Controls ───────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {viewAllHref && (
            <a
              href={viewAllHref}
              className="text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition-colors mr-2 hidden sm:inline-block"
            >
              View all →
            </a>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollBy("left")}
              disabled={!canScrollLeft}
              aria-label="Previous products"
              className={`p-2.5 rounded-full border border-zinc-200 text-zinc-700 bg-white shadow-xs transition-all ${
                !canScrollLeft
                  ? "opacity-35 cursor-not-allowed"
                  : "hover:bg-zinc-900 hover:text-white hover:border-zinc-900 active:scale-95"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => scrollBy("right")}
              disabled={!canScrollRight}
              aria-label="Next products"
              className={`p-2.5 rounded-full border border-zinc-200 text-zinc-700 bg-white shadow-xs transition-all ${
                !canScrollRight
                  ? "opacity-35 cursor-not-allowed"
                  : "hover:bg-zinc-900 hover:text-white hover:border-zinc-900 active:scale-95"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Scrollable Products Container ────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none py-1 -mx-4 px-4 sm:mx-0 sm:px-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children}
      </div>

      {/* Mobile View All Link */}
      {viewAllHref && (
        <div className="mt-4 text-center sm:hidden">
          <a
            href={viewAllHref}
            className="text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            View all products in {title} →
          </a>
        </div>
      )}
    </div>
  );
}

