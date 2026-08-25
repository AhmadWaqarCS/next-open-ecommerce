import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { resolveUserNames } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import Pagination from "@/app/(dashboard)/_components/pagination";
import {
  buildThemeWhereInput,
  ThemeFilterParams,
} from "@/lib/filters/theme-filters";
import { getThemesDashboardDataInDB } from "@/services/theme-services";
import ThemesTable from "./themes-table";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Themes Registry",
  description: "Manage developer theme registries and custom storefront components.",
};

interface PageProps {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}

export default function DashboardThemesPage(props: PageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardThemesPageContent {...props} />
    </Suspense>
  );
}

async function DashboardThemesPageContent({
  searchParams,
}: PageProps) {
  const { permissions } = await assertPermission("read", "/dashboard/themes");
  const params = (await searchParams) || {};

  const currentPage = Math.max(1, Number(params.page ?? 1));
  const pageSize = Math.max(1, Number(params.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const filterParams: ThemeFilterParams = {
    id: typeof params.id === "string" ? params.id : undefined,
    name: typeof params.name === "string" ? params.name : undefined,
    slug: typeof params.slug === "string" ? params.slug : undefined,
    is_active:
      typeof params.is_active === "string" ? params.is_active : undefined,
  };

  const where = buildThemeWhereInput(filterParams);

  const { themes, totalThemes, dashboardUsers } =
    await getThemesDashboardDataInDB(where, skipCount, pageSize);

  const userIds = themes.flatMap((t) =>
    [t.created_by, t.updated_by].filter((id): id is number => id !== null && id > 0),
  );
  const userNames = await resolveUserNames(userIds);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <ThemesTable
        themes={themes as any}
        permissions={permissions}
        userNames={userNames}
        totalCount={totalThemes}
      />

      <Pagination
        totalItems={totalThemes}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="themes"
      />
    </div>
  );
}
