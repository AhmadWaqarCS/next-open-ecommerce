import type { CategoryCarouselConfig, CategoryCarouselItem } from "@/lib/storefront";
import ProductCard from "./ProductCard";
import CategoryCarouselClient from "./CategoryCarouselClient";

// ─── Default Tailwind class slots ─────────────────────────────────────────────
export const CATEGORY_CAROUSEL_DEFAULT_CLASSES = {
  root: "space-y-6",
  section: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8",
  card: "flex-none w-[82%] sm:w-[calc(50%-10px)] md:w-[calc(33.333%-13.33px)] lg:w-[calc(25%-15px)] snap-start",
} as const;

export type CategoryCarouselClassSlot =
  keyof typeof CATEGORY_CAROUSEL_DEFAULT_CLASSES;

function cls(
  slot: CategoryCarouselClassSlot,
  overrides: Record<string, string> | undefined,
): string {
  return overrides?.[slot] ?? CATEGORY_CAROUSEL_DEFAULT_CLASSES[slot];
}

export interface CategoryCarouselComponentProps {
  carousels: CategoryCarouselItem[];
  config: CategoryCarouselConfig;
}

/**
 * CategoryCarousel — Home Page Product Section.
 * Data is passed from `app/(ecommerce)/page.tsx` via `getHomePageData()`.
 * No internal DB call. No `"use cache"` — the parent page handles caching.
 */
export default function CategoryCarousel({
  carousels,
  config,
}: CategoryCarouselComponentProps) {
  const { autoScrollInterval = 4000, classOverrides } = config;
  const overrides = classOverrides as Record<string, string> | undefined;

  if (carousels.length === 0) return null;

  const currencySymbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";

  return (
    <div className={cls("root", overrides)}>
      {carousels.map(({ category, products }) => (
        <section
          key={category.id}
          className={cls("section", overrides)}
        >
          <CategoryCarouselClient
            title={category.name}
            viewAllHref={`/category/${category.slug}`}
            autoScrollInterval={autoScrollInterval}
          >
            {products.map((product, i) => (
              <div
                key={product.id}
                className={cls("card", overrides)}
              >
                <ProductCard
                  product={product}
                  currencySymbol={currencySymbol}
                  priority={i < 4}
                />
              </div>
            ))}
          </CategoryCarouselClient>
        </section>
      ))}
    </div>
  );
}
