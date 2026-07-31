"use cache";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { getSiteConfig, getPageBySlug } from "@/lib/storefront";

export async function generateMetadata(): Promise<Metadata> {
  const [config, page] = await Promise.all([
    getSiteConfig(),
    getPageBySlug("legal-disclaimer"),
  ]);
  const meta = page?.meta_info ?? {};
  return {
    title: meta.title ?? `${page?.title ?? "Legal Disclaimer"} | ${config?.name ?? "Store"}`,
    description: meta.description ?? undefined,
  };
}

export default async function LegalDisclaimerPage() {
  cacheTag("site-config", "site-pages", "page-legal-disclaimer");
  cacheLife("max");

  const page = await getPageBySlug("legal-disclaimer");

  if (!page) {
    notFound();
  }

  return (
    <div className="page-enter min-h-[80vh] bg-zinc-950 text-zinc-100 flex flex-col justify-between">
      <div>
        <div className="border-b border-zinc-900 bg-gradient-to-b from-zinc-900/80 to-zinc-950 pt-28 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-950/60 border border-amber-800/50 rounded-full mb-4">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Legal & Compliance
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {page.title}
            </h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-3xl p-6 sm:p-12 shadow-2xl backdrop-blur-xs">
            <article
              className="prose prose-invert max-w-none text-zinc-300 leading-relaxed text-sm sm:text-base space-y-6 [&_h2]:text-xl [&_h2]:sm:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:border-b [&_h2]:border-zinc-800 [&_h2]:pb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-zinc-100 [&_p]:text-zinc-400 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_li]:text-zinc-400 [&_strong]:text-white [&_a]:text-indigo-400 [&_a]:underline hover:[&_a]:text-indigo-300"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
