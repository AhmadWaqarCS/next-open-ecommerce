import type { HeroCarouselProps, ShopCategory } from "@/lib/storefront";
import HeroCarouselClient, {
  type HeroCarouselSlide,
} from "./HeroCarouselClient";

export interface HeroCarouselComponentProps {
  heroCarouselProps: HeroCarouselProps;
  /** Home categories (show_in_home=true) used as carousel slides */
  homeCategories: ShopCategory[];
}

/**
 * HeroCarousel — Full-screen category slideshow for the home page.
 * Data is passed from `app/(ecommerce)/page.tsx` via `getHomePageData()`.
 * No internal DB call. No `"use cache"` — the parent page handles caching.
 */
export default function HeroCarousel({
  heroCarouselProps,
  homeCategories,
}: HeroCarouselComponentProps) {
  const { autoPlayInterval = 5000, classOverrides } = heroCarouselProps;

  const slides: HeroCarouselSlide[] = homeCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    image_url: cat.image_url,
    bg_color: cat.bg_color,
  }));

  if (slides.length === 0) return null;

  return (
    <HeroCarouselClient
      slides={slides}
      autoPlayInterval={autoPlayInterval}
      classOverrides={classOverrides as Record<string, string> | undefined}
    />
  );
}
