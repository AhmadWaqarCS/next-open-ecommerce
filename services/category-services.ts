import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

export async function createCategoryInDB(data: {
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  image_alt_text?: string | null;
  bg_color?: string | null;
  show_in_header?: boolean;
  show_in_footer?: boolean;
  show_in_home?: boolean;
  parent_id?: number | null;
  sort_order?: number;
  is_active?: boolean;
  meta_info?: object;
  created_by: number;
  updated_by: number;
}) {
  return await prisma.category.create({ data });
}

export async function updateCategoryInDB(
  id: number,
  data: {
    name?: string;
    slug?: string;
    description?: string | null;
    image_url?: string | null;
    image_alt_text?: string | null;
    bg_color?: string | null;
    show_in_header?: boolean;
    show_in_footer?: boolean;
    show_in_home?: boolean;
    parent_id?: number | null;
    sort_order?: number;
    is_active?: boolean;
    meta_info?: object;
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
) {
  return await prisma.category.update({ where: { id }, data });
}

export async function deleteCategoryPermanentlyInDB(id: number) {
  return await prisma.category.delete({ where: { id } });
}

export async function bulkUpdateCategoriesInDB(
  ids: number[],
  data: {
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
  selectAllScope: boolean = false,
  isTrash: boolean = false,
  filterWhere?: Prisma.categoryWhereInput
) {
  const whereCondition: any = selectAllScope
    ? (filterWhere ?? (isTrash ? { NOT: { deleted_at: null } } : { deleted_at: null }))
    : { id: { in: ids } };

  return await prisma.category.updateMany({
    where: whereCondition,
    data,
  });
}

export async function bulkDeleteCategoriesPermanentlyInDB(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.categoryWhereInput
) {
  const whereCondition: any = selectAllScope
    ? (filterWhere ?? { NOT: { deleted_at: null } })
    : { id: { in: ids } };

  return await prisma.category.deleteMany({
    where: whereCondition,
  });
}

export async function getCategoryForRevalidationInDB(id: number) {
  return await prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      image_url: true,
      bg_color: true,
      show_in_header: true,
      show_in_footer: true,
      show_in_home: true,
      parent_id: true,
      sort_order: true,
      is_active: true,
      meta_info: true,
      parent: {
        select: { slug: true },
      },
    },
  });
}

export async function getCategoriesForRevalidationInDB(
  ids: number[],
  selectAllScope: boolean = false,
  isTrash: boolean = false,
  filterWhere?: Prisma.categoryWhereInput
) {
  const whereCondition: any = selectAllScope
    ? (filterWhere ?? (isTrash ? { NOT: { deleted_at: null } } : { deleted_at: null }))
    : { id: { in: ids } };

  return await prisma.category.findMany({
    where: whereCondition,
    select: {
      id: true,
      name: true,
      slug: true,
      show_in_header: true,
      show_in_footer: true,
      show_in_home: true,
      parent_id: true,
      parent: {
        select: { slug: true },
      },
    },
  });
}

