"use cache";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { getSiteConfig, getPageBySlug } from "@/lib/storefront";

export async function generateMetadata(): Promise<Metadata> {
  const [config, page] = await Promise.all([
    getSiteConfig(),
    getPageBySlug("contact"),
  ]);
  const meta = page?.meta_info ?? config?.meta_info ?? {};
  return {
    title: meta.title ?? page?.title ?? "Contact Us",
    description: meta.description ?? undefined,
  };
}

export default async function ContactPage() {
  cacheTag("site-config", "site-pages", "page-contact");
  cacheLife("max");

  const [config, page] = await Promise.all([
    getSiteConfig(),
    getPageBySlug("contact"),
  ]);

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

            <div className="flex flex-col gap-6">
              {config?.email && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center shrink-0">
                    <svg
                      className="w-5 h-5 text-zinc-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.75}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">
                      Email
                    </p>
                    <a
                      href={`mailto:${config.email}`}
                      className="text-zinc-700 hover:text-zinc-900 text-sm transition-colors"
                    >
                      {config.email}
                    </a>
                  </div>
                </div>
              )}

              {config?.phone && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center shrink-0">
                    <svg
                      className="w-5 h-5 text-zinc-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.75}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">
                      Phone
                    </p>
                    <a
                      href={`tel:${config.phone}`}
                      className="text-zinc-700 hover:text-zinc-900 text-sm transition-colors"
                    >
                      {config.phone}
                    </a>
                  </div>
                </div>
              )}

              {config?.address && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center shrink-0">
                    <svg
                      className="w-5 h-5 text-zinc-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.75}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">
                      Address
                    </p>
                    <p className="text-zinc-700 text-sm leading-snug">
                      {config.address}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* page content if exists */}
            {page?.content && (
              <div className="pt-6 border-t border-zinc-100">
                <div className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">
                  {page.content}
                </div>
              </div>
            )}
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
