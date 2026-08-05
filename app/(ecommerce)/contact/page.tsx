"use cache";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { getPageData } from "@/lib/storefront";

export async function generateMetadata(): Promise<Metadata> {
  const pageRes = await getPageData("contact");
  const page = pageRes?.page;
  const meta = page?.meta_info ?? {};
  return {
    title: meta.title ?? page?.title ?? "Contact Us",
    description: meta.description ?? undefined,
  };
}

export default async function ContactPage() {
  cacheTag("page-contact");
  cacheLife("max");

  const { page } = await getPageData("contact");

  if (!page) {
    notFound();
  }

  const title = page.title;
  const subtitle =
    page?.content ?? "We'd love to hear from you. Reach out any time.";

  return (
    <div className="page-enter">
      {/* Hero */}
      <div className="bg-zinc-900 pt-28 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[var(--color-accent)] text-xs font-semibold uppercase tracking-[0.25em] mb-4">
            Get in touch
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
            {title}
          </h1>
          <p className="text-zinc-400 text-lg">{subtitle}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Details */}
          <div className="flex flex-col gap-8">
            <h2 className="text-xl font-bold text-zinc-900">
              Contact Information
            </h2>

            {/* page content */}
            <div className="text-sm text-zinc-600 leading-relaxed space-y-4">
              {page?.content ? (
                <div dangerouslySetInnerHTML={{ __html: page.content }} />
              ) : (
                <p className="text-zinc-500">
                  Please check our footer for full contact details or email us directly.
                </p>
              )}
            </div>
          </div>

          {/* Business hours / extra info card */}
          <div className="bg-zinc-50 rounded-2xl p-8 flex flex-col gap-5">
            <h2 className="text-xl font-bold text-zinc-900">Business Hours</h2>
            <div className="flex flex-col gap-3 text-sm">
              {[
                { day: "Monday – Friday", hours: "9:00 AM – 6:00 PM" },
                { day: "Saturday", hours: "10:00 AM – 4:00 PM" },
                { day: "Sunday", hours: "Closed" },
              ].map((row) => (
                <div
                  key={row.day}
                  className="flex justify-between text-zinc-600 border-b border-zinc-200 pb-2 last:border-0 last:pb-0"
                >
                  <span>{row.day}</span>
                  <span className="font-medium text-zinc-800">{row.hours}</span>
                </div>
              ))}
            </div>

            <div className="mt-2 bg-[var(--color-accent-light,#fef3c7)] border border-[var(--color-accent,#f59e0b)]/20 rounded-xl p-4">
              <p className="text-sm text-zinc-700">
                <span className="font-semibold">Quick tip:</span> For fastest
                response, email us directly. We typically reply within 24 hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
