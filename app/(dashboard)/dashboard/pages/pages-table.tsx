"use client";

import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";
import { site_page } from "@/lib/generated/prisma/client";
import { CRUD } from "@/lib/types";
import Link from "next/link";
import { PageFilterParams } from "@/lib/filters/page-filters";

interface PagesTableProps {
  pages: site_page[];
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
  filterParams?: PageFilterParams;
}

export default function PagesTable({
  pages,
  permissions,
  userNames,
  totalCount,
  filterParams = {},
}: PagesTableProps) {
  const columns: ColumnDef<site_page>[] = [
    {
      header: "Page Title",
      className: "max-w-xs sm:max-w-sm",
      render: (page) =>
        permissions.update ? (
          <Link
            href={`/dashboard/pages/${page.id}/edit`}
            className="group/item flex flex-col gap-0.5 cursor-pointer max-w-xs sm:max-w-sm"
          >
            <span className="font-bold text-zinc-900 dark:text-zinc-50 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors truncate">
              {page.title}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal truncate">
              {page.content ? page.content.replace(/<[^>]*>?/gm, "") : ""}
            </span>
          </Link>
        ) : (
          <div className="flex flex-col gap-0.5 max-w-xs sm:max-w-sm">
            <span className="font-bold text-zinc-900 dark:text-zinc-50 truncate">{page.title}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal truncate">
              {page.content ? page.content.replace(/<[^>]*>?/gm, "") : ""}
            </span>
          </div>
        ),
    },
    {
      header: "Storefront Slug",
      render: (page) => (
        <a
          href={`/${page.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-mono transition-colors"
        >
          <span>/{page.slug}</span>
          <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      ),
    },
    {
      header: "Status",
      render: (page) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            page.is_active
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/50"
              : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              page.is_active ? "bg-emerald-500" : "bg-zinc-400"
            }`}
          />
          {page.is_active ? "Active" : "Disabled"}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      title="Pages"
      description="View and update static storefront page titles, descriptions, and SEO metadata."
      permissions={permissions}
      data={pages}
      totalCount={totalCount}
      columns={columns}
      renderActivity={(page) => (
        <ActivityCell
          createdAt={page.created_at}
          createdBy={page.created_by}
          updatedAt={page.updated_at}
          updatedBy={page.updated_by}
          userNames={userNames}
        />
      )}
      renderActions={(page) => (
        <div className="flex items-center justify-end gap-2">
          {permissions.update && (
            <Link
              href={`/dashboard/pages/${page.id}/edit`}
              className="p-2 rounded-xl text-zinc-500 hover:text-indigo-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-indigo-400 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              title="Edit Page"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Link>
          )}
        </div>
      )}
      filterBar={
        <GlobalFilterBar
          searchKey="title"
          searchPlaceholder="Search pages by title or slug..."
          currentFilters={filterParams as Record<string, string | undefined>}
          customFilters={[
            {
              key: "is_active",
              label: "Status",
              isPrimary: true,
              type: "select",
              options: [
                { value: "true", label: "Active" },
                { value: "false", label: "Disabled" },
              ],
            },
          ]}
        />
      }
      emptyState={{
        title: "No Pages Found",
        description: "There are no static pages matching your filter parameters.",
      }}
    />
  );
}
