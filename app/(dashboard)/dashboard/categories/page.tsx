import { assertPermission } from "@/lib/guards";
import CategoryTable from "./category-table";
import { resolveUserNames } from "@/lib/action-utils";
import Pagination from "@/app/(dashboard)/_components/pagination";
import {
  CategoryFilterParams,
  getCategoryFilterWhere,
} from "@/lib/filters/category-filters";
import { getCategoriesDashboardDataInDB } from "@/services/category-services";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Categories",
  description: "Manage product categories",
};

export default async function DashboardCategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const { permissions } = await assertPermission(
    "read",
    "/dashboard/categories",
  );
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const filterParams: CategoryFilterParams = {
    id: typeof params?.id === "string" ? params.id : undefined,
    name: typeof params?.name === "string" ? params.name : undefined,
    description:
      typeof params?.description === "string" ? params.description : undefined,
    is_active:
      typeof params?.is_active === "string" ? params.is_active : undefined,
    hierarchy:
      typeof params?.hierarchy === "string" ? params.hierarchy : undefined,
    has_image:
      typeof params?.has_image === "string" ? params.has_image : undefined,
    has_meta:
      typeof params?.has_meta === "string" ? params.has_meta : undefined,
    bg_color:
      typeof params?.bg_color === "string" ? params.bg_color : undefined,
    min_products:
      typeof params?.min_products === "string"
        ? params.min_products
        : undefined,
    max_products:
      typeof params?.max_products === "string"
        ? params.max_products
        : undefined,
    created_by:
      typeof params?.created_by === "string" ? params.created_by : undefined,
    created_from:
      typeof params?.created_from === "string"
        ? params.created_from
        : undefined,
    created_to:
      typeof params?.created_to === "string" ? params.created_to : undefined,
    updated_by:
      typeof params?.updated_by === "string" ? params.updated_by : undefined,
    updated_from:
      typeof params?.updated_from === "string"
        ? params.updated_from
        : undefined,
    updated_to:
      typeof params?.updated_to === "string" ? params.updated_to : undefined,
  };

  const where = await getCategoryFilterWhere(filterParams, false);

  const { categories, totalCategories, allCategories, dashboardUsers } =
    await getCategoriesDashboardDataInDB(where, skipCount, pageSize);

  const userIds = categories.flatMap((c) => [c.created_by, c.updated_by]);
  const userNames = await resolveUserNames(userIds);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <CategoryTable
        categories={categories as any}
        parentCategories={allCategories}
        dashboardUsers={dashboardUsers}
        filterParams={filterParams}
        permissions={permissions}
        userNames={userNames}
        totalCount={totalCategories}
      />

      <Pagination
        totalItems={totalCategories}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="categories"
      />
    </div>
  );
}

