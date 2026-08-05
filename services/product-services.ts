import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

// ─── MUTATIONS ONLY ──────────────────────────────────────────────────────────

export async function createProductInDB(data: {
  name: string;
  slug: string;
  description?: string | null;
  short_description?: string | null;
  feature_image_url?: string | null;
  feature_image_alt_text?: string | null;
  price: number;
  compare_at_price?: number | null;
  cost_price?: number | null;
  sku?: string | null;
  stock_quantity?: number;
  low_stock_threshold?: number;
  track_inventory?: boolean;
  weight?: number | null;
  dimensions?: object | null;
  category_id?: number | null;
  is_featured?: boolean;
  is_active?: boolean;
  sort_order?: number;
  meta_info?: object;
  created_by: number;
  updated_by: number;
}) {
  return await prisma.product.create({
    data: data as Prisma.productUncheckedCreateInput,
  });
}

export async function updateProductInDB(
  id: number,
  data: {
    name?: string;
    slug?: string;
    description?: string | null;
    short_description?: string | null;
    feature_image_url?: string | null;
    feature_image_alt_text?: string | null;
    price?: number;
    compare_at_price?: number | null;
    cost_price?: number | null;
    sku?: string | null;
    stock_quantity?: number;
    low_stock_threshold?: number;
    track_inventory?: boolean;
    weight?: number | null;
    dimensions?: object | null;
    category_id?: number | null;
    is_featured?: boolean;
    is_active?: boolean;
    sort_order?: number;
    meta_info?: object;
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
) {
  return await prisma.product.update({
    where: { id },
    data: data as Prisma.productUncheckedUpdateInput,
  });
}

export async function deleteProductPermanentlyInDB(id: number) {
  return await prisma.product.delete({ where: { id } });
}

export async function bulkUpdateProductsInDB(
  ids: number[],
  data: {
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
  selectAllScope: boolean = false,
  isTrash: boolean = false,
  filterWhere?: Prisma.productWhereInput,
) {
  const whereCondition: any = selectAllScope
    ? (filterWhere ??
      (isTrash ? { NOT: { deleted_at: null } } : { deleted_at: null }))
    : { id: { in: ids } };

  return await prisma.product.updateMany({
    where: whereCondition,
    data: data as Prisma.productUncheckedUpdateInput,
  });
}

export async function bulkDeleteProductsPermanentlyInDB(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.productWhereInput,
) {
  const whereCondition: any = selectAllScope
    ? (filterWhere ?? { NOT: { deleted_at: null } })
    : { id: { in: ids } };

  return await prisma.product.deleteMany({
    where: whereCondition,
  });
}

export async function getProductForRevalidationInDB(id: number) {
  return await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      compare_at_price: true,
      feature_image_url: true,
      feature_image_alt_text: true,
      category_id: true,
      category_name: true,
      is_featured: true,
      is_active: true,
      sort_order: true,
      description: true,
      short_description: true,
      sku: true,
      stock_quantity: true,
      category: {
        select: { slug: true },
      },
    },
  });
}

export async function getProductsForRevalidationInDB(
  ids: number[],
  selectAllScope: boolean = false,
  isTrash: boolean = false,
  filterWhere?: Prisma.productWhereInput
) {
  const whereCondition: any = selectAllScope
    ? (filterWhere ?? (isTrash ? { NOT: { deleted_at: null } } : { deleted_at: null }))
    : { id: { in: ids } };

  return await prisma.product.findMany({
    where: whereCondition,
    select: {
      id: true,
      name: true,
      slug: true,
      category_id: true,
      is_featured: true,
      category: {
        select: { slug: true },
      },
    },
  });
}

