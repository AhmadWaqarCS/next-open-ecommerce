import { assertPermission } from "@/lib/guards";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteComponentForm from "../../_components/site-component-form";
import { getSiteComponentEditDataInDB } from "@/services/site-component-services";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Site Component",
  description: "Update site component properties and layout defaults",
};

export default async function EditSiteComponentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await assertPermission("update", "/dashboard/site-components");
  const { id } = await params;
  const componentId = Number(id);

  if (isNaN(componentId) || componentId < 1) {
    notFound();
  }

  const component = await getSiteComponentEditDataInDB(componentId);

  if (!component) {
    notFound();
  }

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Edit Site Component
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Update settings, properties, and attributes for &quot;{component.name}&quot;.
          </p>
        </div>
        <div>
          <Link
            href="/dashboard/site-components"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 dark:text-zinc-400 transition-all shadow-xs cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Back to Site Components</span>
          </Link>
        </div>
      </div>

      {/* Main Form */}
      <SiteComponentForm initialData={component} />
    </div>
  );
}
