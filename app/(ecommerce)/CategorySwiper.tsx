import Link from "next/link";
import Image from "next/image";
import type { ShopCategory } from "@/lib/storefront";

export interface CategorySwiperProps {
  content: ShopCategory[];
  title?: string;
}

const categoryScopedStyles = `
  .category-card {
    transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 300ms cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

/**
 * CategorySwiper — Home Page Shop by Category Block.
 * Placed beside `app/(ecommerce)/page.tsx`.
 */
export default function CategorySwiper({
  content = [],
  title = "Shop by Category",
}: CategorySwiperProps) {
  if (!content || content.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <style dangerouslySetInnerHTML={{ __html: categoryScopedStyles }} />

      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-8">
        {title}
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {content.map((cat) => {
          const bgClass = cat.bg_color?.includes("bg-")
            ? cat.bg_color
            : `bg-gradient-to-br ${cat.bg_color ?? "from-zinc-800 to-zinc-950"}`;

          return (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className={`category-card ${bgClass} rounded-2xl aspect-square flex flex-col items-start justify-end p-5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group overflow-hidden relative shadow-sm`}
            >
              {cat.image_url && (
                <Image
                  src={cat.image_url}
                  alt={cat.name}
                  fill
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
  );
}
