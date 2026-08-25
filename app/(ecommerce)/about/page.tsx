"use cache";

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { getPageData } from "@/lib/storefront";
import { loadThemeComponent } from "@/lib/theme-loader";

export async function generateMetadata(): Promise<Metadata> {
  const pageRes = await getPageData("about");
  const page = pageRes?.page;
  const meta = page?.meta_info ?? {};
  return {
    title:
      meta.title && meta.title !== "" ? meta.title : page?.title || "About Us",
    description: meta.description ?? undefined,
  };
}

export default async function AboutPage() {
  cacheTag("about-page");
  cacheLife("max");

  const pageRes = await getPageData("about");
  const page = pageRes?.page;

  if (!page) {
    notFound();
  }

  const pageThemeCfg = (page.theme_config ?? {}) as Record<string, any>;
  if (pageThemeCfg.theme_name && pageThemeCfg.component_path) {
    const CustomAbout = await loadThemeComponent(
      pageThemeCfg.theme_name,
      pageThemeCfg.component_path,
    );
    if (CustomAbout) {
      return (
        <>
          {page.custom_css && (
            <style dangerouslySetInnerHTML={{ __html: page.custom_css }} />
          )}
          <CustomAbout
            content={page}
            themeConfig={pageThemeCfg.theme_config}
          />
        </>
      );
    }
  }

  const title = page.title;
  const body = page.content;

  return (
    <div className="page-enter">
      {page.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: page.custom_css }} />
      )}
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

        <div className="mt-16 pt-10 border-t border-zinc-100 text-center">
          <h2 className="text-xl font-bold text-zinc-900 mb-4">
            Have questions?
          </h2>
          <p className="text-zinc-500 text-sm mb-6">
            We&apos;re here to help. Reach out to our customer care team.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-zinc-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-zinc-700 transition-colors text-sm"
          >
            Contact Us →
          </Link>
        </div>
      </div>
    </div>
  );
}
