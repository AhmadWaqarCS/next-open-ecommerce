import { assertPermission } from "@/lib/guards";
import type { Metadata } from "next";
import Link from "next/link";
import CreatePageForm from "./create-page-form";
import { getActiveThemesWithComponentsInDB } from "@/services/theme-services";

export const metadata: Metadata = {
  title: "Create Page",
};

export default async function CreatePageDashboardPage() {
  const { permissions } = await assertPermission("create", "/dashboard/pages");
  const activeThemes = await getActiveThemesWithComponentsInDB();

  return (
    <div className="space-y-6 flex-1 flex flex-col pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/dashboard/pages"
          className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
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
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">
          Create New Page
        </span>
      </div>

      <CreatePageForm
        activeThemes={activeThemes as any}
        permissions={permissions}
      />
    </div>
  );
}
