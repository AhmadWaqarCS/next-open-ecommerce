import Link from "next/link";
import Image from "next/image";
import type { ShopCategory } from "@/lib/storefront";

export interface AllCategoriesMainProps {
  categories: ShopCategory[];
  siteName: string;
}

const allCategoriesScopedStyles = `
  .category-grid-card {
    transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 300ms cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

/**
 * AllCategoriesMain — Consolidated Component for All Categories Page.
 * Located beside `app/(ecommerce)/category/page.tsx`.
 */
export default function AllCategoriesMain({
  categories = [],
  siteName = "Store",
}: AllCategoriesMainProps) {
  return (
    <div className="page-enter">
      <style dangerouslySetInnerHTML={{ __html: allCategoriesScopedStyles }} />

      {/* Dark Banner */}
      <div className="bg-gradient-to-br from-zinc-800 to-zinc-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          <nav className="mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-white/60">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li className="text-white/40">/</li>
              <li className="text-white/80 font-medium">All Categories</li>
            </ol>
          </nav>
          <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-3">
            All Categories
          </h1>
          <p className="text-white/60 text-lg">
            Browse everything {siteName} has to offer.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {categories.length === 0 ? (
          <p className="text-zinc-400 text-sm">No categories found.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {categories.map((cat) => {
              const bgClass = cat.bg_color?.includes("bg-")
                ? cat.bg_color
                : `bg-gradient-to-br ${cat.bg_color ?? "from-zinc-800 to-zinc-950"}`;

              return (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className={`category-grid-card ${bgClass} rounded-2xl aspect-4/3 flex flex-col items-start justify-end p-6 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group overflow-hidden relative shadow-md`}
                >
                  {cat.image_url && (
                    <Image
                      src={cat.image_url}
                      alt={cat.name}
                      fill
                      className="object-cover opacity-40 group-hover:opacity-55 transition-opacity"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  )}
                  <div className="relative z-10">
                    <span className="text-white font-bold text-lg group-hover:underline block leading-tight">
                      {cat.name}
                    </span>
                    {cat.product_count > 0 && (
                      <span className="text-white/60 text-sm">
                        {cat.product_count} items
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
