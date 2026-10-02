import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { resolveUserNames, serializePages } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  PageFilterParams,
  buildPageWhereInput,
} from "@/lib/filters/page-filters";
import PagesTable from "./pages-table";
import { getPagesDashboardDataInDB } from "@/services/page-services";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pages",
  description: "Manage static pages and content for your storefront.",
};

interface PageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function DashboardPagesPage(props: PageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardPagesPageContent {...props} />
    </Suspense>
  );
}

async function DashboardPagesPageContent({ searchParams }: PageProps) {
  const { permissions } = await assertPermission("read", "/dashboard/pages");
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const filterParams: PageFilterParams = {
    id: typeof params?.id === "string" ? params.id : undefined,
    title: typeof params?.title === "string" ? params.title : undefined,
    slug: typeof params?.slug === "string" ? params.slug : undefined,
    search: typeof params?.search === "string" ? params.search : undefined,
    is_active:
      typeof params?.is_active === "string" ? params.is_active : undefined,
    show_in_header:
      typeof params?.show_in_header === "string"
        ? params.show_in_header
        : undefined,
    show_in_footer:
      typeof params?.show_in_footer === "string"
        ? params.show_in_footer
        : undefined,
    created_by:
      typeof params?.created_by === "string" ? params.created_by : undefined,
    updated_by:
      typeof params?.updated_by === "string" ? params.updated_by : undefined,
    created_from:
      typeof params?.created_from === "string" ? params.created_from : undefined,
    created_to:
      typeof params?.created_to === "string" ? params.created_to : undefined,
    updated_from:
      typeof params?.updated_from === "string" ? params.updated_from : undefined,
    updated_to:
      typeof params?.updated_to === "string" ? params.updated_to : undefined,
  };

  const where = buildPageWhereInput(filterParams);

  const { pagesRaw, totalPages, dashboardUsers } =
    await getPagesDashboardDataInDB(where, skipCount, pageSize);

  const pages = serializePages(pagesRaw);
  const userIds = pages.flatMap((p) => [p.created_by, p.updated_by]);
  const userNames = await resolveUserNames(userIds);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <PagesTable
        pages={pages as any}
        dashboardUsers={dashboardUsers}
        filterParams={filterParams}
        permissions={permissions}
        userNames={userNames}
        totalCount={totalPages}
        currentPage={currentPage}
        pageSize={pageSize}
      />
    </div>
  );
}
