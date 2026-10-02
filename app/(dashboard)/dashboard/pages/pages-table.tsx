"use client";

import Link from "next/link";
import {
  toggleSitePageStatus,
  bulkToggleSitePages,
} from "@/actions/page-actions";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import { CRUD, site_page, PROTECTED_SYSTEM_SLUGS } from "@/lib/types";
import { PageFilterParams } from "@/lib/filters/page-filters";

interface PagesTableProps {
  pages: site_page[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  filterParams?: PageFilterParams;
}

export default function PagesTable({
  pages,
  dashboardUsers = [],
  permissions,
  userNames,
  totalCount = 0,
  currentPage = 1,
  pageSize = 10,
  filterParams = {},
}: PagesTableProps) {
  const columns: ColumnDef<site_page>[] = [
    {
      header: "Page Title",
      className: "max-w-xs sm:max-w-sm",
      render: (page) => (
        <div className="flex flex-col gap-0.5 max-w-xs sm:max-w-sm">
          <div className="flex items-center gap-2">
            {permissions.update ? (
              <Link
                href={`/dashboard/pages/${page.id}`}
                className="font-bold text-dashboard-fg hover:text-dashboard-primary hover:underline truncate transition-colors cursor-pointer"
              >
                {page.title}
              </Link>
            ) : (
              <span className="font-bold text-dashboard-fg truncate">
                {page.title}
              </span>
            )}
            {PROTECTED_SYSTEM_SLUGS.includes(page.slug) && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-border shrink-0">
                Core System
              </span>
            )}
          </div>
          <span className="text-xs text-dashboard-muted font-normal truncate">
            {page.content
              ? page.content.replace(/<[^>]*>?/gm, "")
              : "Static / System Template"}
          </span>
        </div>
      ),
    },
    {
      header: "Storefront Route",
      render: (page) => {
        const routePath = page.slug === "/" ? "/" : `/${page.slug}`;
        return (
          <a
            href={routePath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dashboard-muted-bg text-dashboard-fg hover:text-dashboard-primary text-xs font-mono transition-colors border border-dashboard-border"
          >
            <span>{routePath}</span>
            <svg
              className="w-3 h-3 text-dashboard-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        );
      },
    },
    {
      header: "Visibility",
      render: (page) => (
        <div className="flex flex-wrap gap-1.5">
          {page.show_in_header && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-border">
              Header
            </span>
          )}
          {page.show_in_footer && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-dashboard-muted-bg text-dashboard-muted border border-dashboard-border">
              Footer
            </span>
          )}
          {!page.show_in_header && !page.show_in_footer && (
            <span className="text-xs text-dashboard-muted">—</span>
          )}
        </div>
      ),
    },
    {
      header: "Sort Order",
      render: (page) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-dashboard-muted-bg text-dashboard-muted border border-dashboard-border">
          #{page.sort_order}
        </span>
      ),
    },
  ];

  return (
    <DataTable<site_page>
      title="Storefront Pages"
      description="Manage content, menu visibility, custom CSS, and scoped theme designs for your storefront section pages."
      permissions={permissions}
      data={pages}
      columns={columns}
      filterConfig={{
        searchKey: "search",
        searchPlaceholder: "Search pages by title or slug...",
        users: dashboardUsers,
        customFilters: [
          {
            key: "is_active",
            label: "Status",
            type: "select",
            isPrimary: true,
            options: [
              { value: "true", label: "Active" },
              { value: "false", label: "Disabled" },
            ],
          },
          {
            key: "show_in_header",
            label: "In Header Menu",
            type: "select",
            options: [
              { value: "true", label: "Yes" },
              { value: "false", label: "No" },
            ],
          },
          {
            key: "show_in_footer",
            label: "In Footer Menu",
            type: "select",
            options: [
              { value: "true", label: "Yes" },
              { value: "false", label: "No" },
            ],
          },
        ],
      }}
      paginationConfig={{
        totalItems: totalCount,
        currentPage,
        pageSize,
        itemName: "pages",
      }}
      statusConfig={{
        statusKey: "is_active",
        onToggleStatus: async (item, newStatus) => {
          return await toggleSitePageStatus(item.id, newStatus);
        },
      }}
      activityConfig={{ userNames }}
      actionConfig={{
        editHref: (page) => `/dashboard/pages/${page.id}`,
      }}
      bulkConfig={{
        onBulkSetStatus: async (ids, selectAllScope, is_active) => {
          return await bulkToggleSitePages(
            ids,
            is_active,
            selectAllScope,
            filterParams,
          );
        },
      }}
      getRowHref={(page) =>
        permissions.update ? `/dashboard/pages/${page.id}` : ""
      }
      emptyState={{
        title: "No Pages Found",
        description: "There are no storefront pages matching your filter parameters.",
      }}
    />
  );
}
