import { assertPermission } from "@/lib/guards";
import ProductTable from "./product-table";
import { resolveUserNames, serializeProducts } from "@/lib/action-utils";
import Pagination from "@/app/(dashboard)/_components/pagination";
import {
  ProductFilterParams,
  getProductFilterWhere,
} from "@/lib/filters/product-filters";
import { getProductsDashboardDataInDB } from "@/services/product-services";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products",
  description: "Manage storefront products catalog",
};

export default async function DashboardProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const { permissions } = await assertPermission("read", "/dashboard/products");
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const filterParams: ProductFilterParams = {
    id: typeof params?.id === "string" ? params.id : undefined,
    name: typeof params?.name === "string" ? params.name : undefined,
    category_id: typeof params?.category_id === "string" ? params.category_id : undefined,
    is_active: typeof params?.is_active === "string" ? params.is_active : undefined,
    is_featured: typeof params?.is_featured === "string" ? params.is_featured : undefined,
    min_price: typeof params?.min_price === "string" ? params.min_price : undefined,
    max_price: typeof params?.max_price === "string" ? params.max_price : undefined,
    on_sale: typeof params?.on_sale === "string" ? params.on_sale : undefined,
    track_inventory: typeof params?.track_inventory === "string" ? params.track_inventory : undefined,
    has_image: typeof params?.has_image === "string" ? params.has_image : undefined,
    description: typeof params?.description === "string" ? params.description : undefined,
    stock_status: typeof params?.stock_status === "string" ? params.stock_status : undefined,
    min_stock: typeof params?.min_stock === "string" ? params.min_stock : undefined,
    max_stock: typeof params?.max_stock === "string" ? params.max_stock : undefined,
    has_variants: typeof params?.has_variants === "string" ? params.has_variants : undefined,
    has_meta: typeof params?.has_meta === "string" ? params.has_meta : undefined,
    created_by: typeof params?.created_by === "string" ? params.created_by : undefined,
    created_from: typeof params?.created_from === "string" ? params.created_from : undefined,
    created_to: typeof params?.created_to === "string" ? params.created_to : undefined,
    updated_by: typeof params?.updated_by === "string" ? params.updated_by : undefined,
    updated_from: typeof params?.updated_from === "string" ? params.updated_from : undefined,
    updated_to: typeof params?.updated_to === "string" ? params.updated_to : undefined,
  };

  const where = getProductFilterWhere(filterParams, false);

  const { productsRaw, categories, totalProducts, dashboardUsers } =
    await getProductsDashboardDataInDB(where, skipCount, pageSize);

  const products = serializeProducts(productsRaw);
  const userIds = products.flatMap((p) => [p.created_by, p.updated_by]);
  const userNames = await resolveUserNames(userIds);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <ProductTable
        products={products as any}
        categories={categories}
        dashboardUsers={dashboardUsers}
        filterParams={filterParams}
        permissions={permissions}
        userNames={userNames}
        totalCount={totalProducts}
      />

      <Pagination
        totalItems={totalProducts}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="products"
      />
    </div>
  );
}
