"use cache";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { getPageData } from "@/lib/storefront";
import { loadThemeComponent } from "@/lib/theme-loader";
import prisma from "@/lib/prisma";

interface DynamicStorefrontPageProps {
  params: Promise<{ not_found: string[] }>;
}

export async function generateStaticParams() {
  try {
    const pages = await prisma.site_page.findMany({
      where: { is_active: true },
      select: { slug: true },
    });
    return pages
      .filter(
        (p) =>
          p.slug !== "/" &&
          !p.slug.includes("[slug]") &&
          ![
            "about",
            "contact",
            "search",
            "category",
            "product",
            "checkout",
            "newsletter",
          ].includes(p.slug),
      )
      .map((p) => ({ not_found: p.slug.split("/") }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: DynamicStorefrontPageProps): Promise<Metadata> {
  const { not_found } = await params;
  const slug = (not_found || []).join("/");
  const pageRes = await getPageData(slug);
  const page = pageRes?.page;
  const meta = page?.meta_info ?? {};

  if (!page) {
    return {
      title: "Page Not Found",
    };
  }

  return {
    title: meta.title && meta.title !== "" ? meta.title : page.title,
    description: meta.description || undefined,
    keywords: meta.keywords || undefined,
    openGraph: {
      title: meta.og_title || meta.title || page.title,
      description: meta.og_description || meta.description || undefined,
      images: meta.og_image ? [{ url: meta.og_image }] : undefined,
    },
  };
}

export default async function DynamicStorefrontPage({
  params,
}: DynamicStorefrontPageProps) {
  const { not_found } = await params;
  const slug = (not_found || []).join("/");

  cacheTag(`page-${slug}`);
  cacheTag(`site-page-${slug}`);
  cacheLife("max");

  const { page } = await getPageData(slug);

  if (!page) {
    notFound();
  }

  const pageThemeCfg = (page.theme_config ?? {}) as Record<string, any>;
  if (pageThemeCfg.theme_name && pageThemeCfg.component_path) {
    const CustomPage = await loadThemeComponent(
      pageThemeCfg.theme_name,
      pageThemeCfg.component_path,
    );
    if (CustomPage) {
      return (
        <>
          {page.custom_css && (
            <style dangerouslySetInnerHTML={{ __html: page.custom_css }} />
          )}
          <CustomPage content={page} themeConfig={pageThemeCfg.theme_config} />
        </>
      );
    }
  }

  return (
    <div className="page-enter min-h-[80vh] bg-zinc-950 text-zinc-100 flex flex-col justify-between">
      {page.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: page.custom_css }} />
      )}
      <div>
        <div className="border-b border-zinc-900 bg-gradient-to-b from-zinc-900/80 to-zinc-950 pt-28 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {page.title}
            </h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-3xl p-6 sm:p-12 shadow-2xl backdrop-blur-xs">
            {page.content ? (
              <article
                className="prose prose-invert max-w-none text-zinc-300 leading-relaxed text-sm sm:text-base space-y-6 [&_h2]:text-xl [&_h2]:sm:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:border-b [&_h2]:border-zinc-800 [&_h2]:pb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-zinc-100 [&_p]:text-zinc-400 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_li]:text-zinc-400 [&_strong]:text-white [&_a]:text-indigo-400 [&_a]:underline hover:[&_a]:text-indigo-300"
                dangerouslySetInnerHTML={{ __html: page.content }}
              />
            ) : (
              <div className="text-center py-12 text-zinc-400 text-sm">
                No content available for this page.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
