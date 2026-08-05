"use cache";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { getPageData } from "@/lib/storefront";

export async function generateMetadata(): Promise<Metadata> {
  const pageRes = await getPageData("return-and-refund-policy");
  const page = pageRes?.page;
  const meta = page?.meta_info ?? {};
  return {
    title: meta.title ?? page?.title ?? "Return and Refund Policy",
    description: meta.description ?? undefined,
  };
}

export default async function ReturnAndRefundPolicyPage() {
  cacheTag("page-return-and-refund-policy");
  cacheLife("max");

  const { page } = await getPageData("return-and-refund-policy");

  if (!page) {
    notFound();
  }

  return (
    <div className="page-enter min-h-[80vh] bg-zinc-950 text-zinc-100 flex flex-col justify-between">
      <div>
        <div className="border-b border-zinc-900 bg-gradient-to-b from-zinc-900/80 to-zinc-950 pt-28 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-teal-400 bg-teal-950/60 border border-teal-800/50 rounded-full mb-4">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 15v-1a4 4 0 00-4-4H4m0 0l4-4m-4 4l4 4m6 0v1a4 4 0 004 4h4m0 0l-4-4m4 4l-4 4" />
              </svg>
              Returns & Guarantee
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {page.title}
            </h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-3xl p-6 sm:p-12 shadow-2xl backdrop-blur-xs">
            <article
              className="prose prose-invert max-w-none text-zinc-300 leading-relaxed text-sm sm:text-base space-y-6 [&_h2]:text-xl [&_h2]:sm:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:border-b [&_h2]:border-zinc-800 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-zinc-100 [&_p]:text-zinc-400 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_li]:text-zinc-400 [&_strong]:text-white [&_a]:text-indigo-400 [&_a]:underline hover:[&_a]:text-indigo-300"
              dangerouslySetInnerHTML={{ __html: page.content || "" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
