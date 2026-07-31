import { resolveUserNames, serializePages } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";
import Pagination from "@/app/(dashboard)/_components/pagination";
import {
  PageFilterParams,
  buildPageWhereInput,
} from "@/lib/filters/page-filters";
import PagesTable from "./pages-table";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pages",
  description: "Manage static pages and content for your storefront.",
};

export default async function DashboardPagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { permissions } = await assertPermission("read", "/dashboard/pages");
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const filterParams: PageFilterParams = {
    id: typeof params?.id === "string" ? params.id : undefined,
    title: typeof params?.title === "string" ? params.title : undefined,
    slug: typeof params?.slug === "string" ? params.slug : undefined,
    is_active: typeof params?.is_active === "string" ? params.is_active : undefined,
  };

  const where = buildPageWhereInput(filterParams);

  const [pagesRaw, totalPages] = await Promise.all([
    prisma.site_page.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        is_active: true,
        meta_info: true,
        created_at: true,
        created_by: true,
        updated_at: true,
        updated_by: true,
        deleted_at: true,
        deleted_by: true,
      },
      take: pageSize,
      skip: skipCount,
      orderBy: { id: "asc" },
    }),
    prisma.site_page.count({ where }),
  ]);

  const pages = serializePages(pagesRaw);
  const userIds = pages.flatMap((p) => [p.created_by, p.updated_by]);
  const userNames = await resolveUserNames(userIds);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <PagesTable
        pages={pages as any}
        filterParams={filterParams}
        permissions={permissions}
        userNames={userNames}
        totalCount={totalPages}
      />

      <Pagination
        totalItems={totalPages}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="pages"
      />
    </div>
  );
}
