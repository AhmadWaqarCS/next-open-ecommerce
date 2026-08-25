"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

export interface HeroCarouselSlide {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  bg_color: string | null;
}

interface HeroCarouselClientProps {
  slides: HeroCarouselSlide[];
  autoPlayInterval?: number;
  classOverrides?: Record<string, string>;
}

// ─── Default class slots ──────────────────────────────────────────────────────
export const HERO_CAROUSEL_DEFAULT_CLASSES = {
  root: "relative w-full min-h-screen overflow-hidden bg-zinc-950 select-none",
  slideTrack: "flex h-full transition-transform duration-700 ease-in-out",
  slide: "relative flex-none w-full min-h-screen",
  slideOverlay:
    "absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent",
  slideContent:
    "absolute inset-0 flex flex-col items-center justify-end pb-28 px-6 text-center z-10",
  slideTitle:
    "text-white text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tighter mb-6 leading-tight",
  slideCta:
    "inline-block bg-white text-zinc-900 font-semibold px-8 py-3.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95",
  dotRow:
    "absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2.5 z-20",
  dot: "w-2 h-2 rounded-full transition-all duration-300",
  dotActive: "bg-white w-6",
  dotInactive: "bg-white/40 hover:bg-white/70",
  navButton:
    "absolute top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 active:scale-95",
  navPrev: "left-4 sm:left-6",
  navNext: "right-4 sm:right-6",
} as const;

type ClassSlot = keyof typeof HERO_CAROUSEL_DEFAULT_CLASSES;

function cls(slot: ClassSlot, overrides?: Record<string, string>): string {
  return overrides?.[slot] ?? HERO_CAROUSEL_DEFAULT_CLASSES[slot];
}

export default function HeroCarouselClient({
  slides,
  autoPlayInterval = 5000,
  classOverrides,
}: HeroCarouselClientProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = slides.length;

  const goTo = useCallback(
    (index: number) => {
      setCurrent((prev) => {
        if (index < 0) return count - 1;
        if (index >= count) return 0;
        return index;
      });
    },
    [count],
  );

  // Autoplay
  useEffect(() => {
    if (!autoPlayInterval || paused || count < 2) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        setCurrent((prev) => (prev + 1) % count);
      }
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [autoPlayInterval, paused, count]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      goTo(delta < 0 ? current + 1 : current - 1);
    }
    touchStartX.current = null;
  };

  if (count === 0) return null;

  const overrides = classOverrides;

  return (
    <div
      className={cls("root", overrides)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide Track */}
      <div
        className={cls("slideTrack", overrides)}
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={cls("slide", overrides)}
            style={
              !slide.image_url
                ? { background: slide.bg_color ?? "#18181b" }
                : undefined
            }
            aria-hidden={i !== current}
          >
            {/* Background Image */}
            {slide.image_url && (
              <Image
                src={slide.image_url}
                alt={slide.name}
                fill
                className="object-cover"
                priority={i === 0}
                sizes="100vw"
              />
            )}

            {/* Overlay */}
            <div className={cls("slideOverlay", overrides)} />

            {/* Content */}
            <div className={cls("slideContent", overrides)}>
              <h2 className={cls("slideTitle", overrides)}>{slide.name}</h2>
              <Link
                href={`/category/${slide.slug}`}
                className={cls("slideCta", overrides)}
              >
                Shop {slide.name}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Prev / Next Buttons */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            aria-label="Previous slide"
            className={`${cls("navButton", overrides)} ${cls("navPrev", overrides)}`}
          >
            <svg
              className="w-5 h-5"
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
            onClick={() => goTo(current + 1)}
            aria-label="Next slide"
            className={`${cls("navButton", overrides)} ${cls("navNext", overrides)}`}
          >
            <svg
              className="w-5 h-5"
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
        </>
      )}

      {/* Dot Indicators */}
      {count > 1 && (
        <div className={cls("dotRow", overrides)} role="tablist">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={`${cls("dot", overrides)} ${
                i === current
                  ? cls("dotActive", overrides)
                  : cls("dotInactive", overrides)
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
