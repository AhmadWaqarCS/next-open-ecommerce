"use cache";

import { cacheLife, cacheTag } from "next/cache";
import { getHomeCategoryCarousels } from "@/lib/storefront";
import ProductCard from "./ProductCard";
import CategoryCarouselClient from "./CategoryCarouselClient";

export interface CategoryCarouselProps {
  limit?: number;
  autoScrollInterval?: number;
}

export default async function CategoryCarousel({
  limit = 10,
  autoScrollInterval = 4000,
}: CategoryCarouselProps) {
  cacheTag("category-carousels", "home-categories");
  cacheLife("max");

  const carousels = await getHomeCategoryCarousels(limit);

  if (carousels.length === 0) return null;

  const currencySymbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";

  return (
    <div className="space-y-6">
      {carousels.map(({ category, products }) => {
        const displayTitle = category.name;
        const viewAllHref = `/category/${category.slug}`;

        return (
          <section
            key={category.id}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          >
            <CategoryCarouselClient
              title={displayTitle}
              viewAllHref={viewAllHref}
              autoScrollInterval={autoScrollInterval}
            >
              {products.map((product, i) => (
                <div
                  key={product.id}
                  className="flex-none w-[82%] sm:w-[calc(50%-10px)] md:w-[calc(33.333%-13.33px)] lg:w-[calc(25%-15px)] snap-start"
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
        );
      })}
    </div>
  );
}
