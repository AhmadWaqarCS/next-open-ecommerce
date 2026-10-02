import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import SitePageForm from "../_components/site-page-form";
import { getActiveThemesWithComponentsInDB } from "@/services/theme-services";

export const metadata: Metadata = {
  title: "Edit Page Configuration",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditPageConfigPage(props: PageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <EditPageConfigPageContent {...props} />
    </Suspense>
  );
}

async function EditPageConfigPageContent({ params }: PageProps) {
  const { permissions } = await assertPermission("update", "/dashboard/pages");
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!id || isNaN(id)) notFound();

  const [page, activeThemes] = await Promise.all([
    prisma.site_page.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        meta_info: true,
        theme_config: true,
        custom_css: true,
        is_active: true,
        show_in_header: true,
        show_in_footer: true,
        sort_order: true,
        created_at: true,
        created_by: true,
        updated_at: true,
        updated_by: true,
      },
    }),
    getActiveThemesWithComponentsInDB(),
  ]);

  if (!page) notFound();

  return (
    <div className="space-y-6 flex-1 flex flex-col pb-12">
      {/* Semantic Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-dashboard-muted">
        <Link
          href="/dashboard/pages"
          className="hover:text-dashboard-fg transition-colors"
        >
          Pages
        </Link>
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span className="text-dashboard-fg font-medium truncate">
          {page.title}
        </span>
        <span className="font-mono text-xs bg-dashboard-muted-bg text-dashboard-muted border border-dashboard-border px-1.5 py-0.5 rounded-md">
          {page.slug === "/" ? "/" : `/${page.slug}`}
        </span>
      </div>

      <SitePageForm
        page={page as any}
        activeThemes={activeThemes as any}
        permissions={permissions}
      />
    </div>
  );
}
