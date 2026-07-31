"use cache";

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { getSiteConfig, getPageBySlug } from "@/lib/storefront";

export async function generateMetadata(): Promise<Metadata> {
  const [config, page] = await Promise.all([
    getSiteConfig(),
    getPageBySlug("about"),
  ]);
  const meta = page?.meta_info ?? config?.meta_info ?? {};
  return {
    title:
      meta.title && meta.title !== "" ? meta.title : page?.title || "About Us",
    description: meta.description ?? undefined,
  };
}

export default async function AboutPage() {
  cacheTag("site-config", "site-pages", "page-about");
  cacheLife("max");

  const [config, page] = await Promise.all([
    getSiteConfig(),
    getPageBySlug("about"),
  ]);

  if (!page) {
    notFound();
  }

  const title = page.title;
  const body = page.content;

  return (
    <div className="page-enter">
      {/* Hero */}
      <div className="bg-zinc-900 pt-28 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[var(--color-accent)] text-xs font-semibold uppercase tracking-[0.25em] mb-4">
            Our Story
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {body ? (
          <div className="prose prose-zinc max-w-none text-zinc-600 leading-relaxed text-base whitespace-pre-line">
            {body}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-zinc-400 text-lg">
              We&apos;re still writing our story. Check back soon!
            </p>
          </div>
        )}

        {/* Contact info */}
        {config && (config.email || config.phone || config.address) && (
          <div className="mt-16 pt-10 border-t border-zinc-100">
            <h2 className="text-xl font-bold text-zinc-900 mb-6">
              Get in touch
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {config.email && (
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Email
                  </p>
                  <a
                    href={`mailto:${config.email}`}
                    className="text-zinc-700 hover:text-zinc-900 text-sm transition-colors"
                  >
                    {config.email}
                  </a>
                </div>
              )}
              {config.phone && (
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Phone
                  </p>
                  <a
                    href={`tel:${config.phone}`}
                    className="text-zinc-700 hover:text-zinc-900 text-sm transition-colors"
                  >
                    {config.phone}
                  </a>
                </div>
              )}
              {config.address && (
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Address
                  </p>
                  <p className="text-zinc-700 text-sm leading-snug">
                    {config.address}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-8">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-zinc-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-zinc-700 transition-colors text-sm"
              >
                Send a message →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
