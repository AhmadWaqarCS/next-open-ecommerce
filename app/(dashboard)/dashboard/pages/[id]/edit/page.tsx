import { serializePage } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageForm from "../../_components/page-form";
import { getPageEditDataInDB } from "@/services/page-services";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Page",
  description: "Update static storefront page content and SEO metadata.",
};

export default async function EditDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { permissions } = await assertPermission("update", "/dashboard/pages");
  const { id } = await params;
  const pageId = Number(id);

  if (isNaN(pageId) || pageId < 1) {
    notFound();
  }

  const pageRaw = await getPageEditDataInDB(pageId);

  if (!pageRaw) {
    notFound();
  }

  const page = serializePage(pageRaw);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Edit Page — {page.title}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Update content and SEO settings for &quot;/{page.slug}&quot;.
          </p>
        </div>
        <div>
          <Link
            href="/dashboard/pages"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 dark:text-zinc-400 transition-all shadow-xs cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Pages</span>
          </Link>
        </div>
      </div>

      {/* Form Card */}
      <PageForm initialData={page as any} permissions={permissions} />
    </div>
  );
}
