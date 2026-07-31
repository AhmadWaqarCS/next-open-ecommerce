import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

const shippingSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  free_over: true,
  estimated_days_min: true,
  estimated_days_max: true,
  is_active: true,
  sort_order: true,
  created_at: true,
  created_by: true,
  updated_at: true,
  updated_by: true,
  deleted_at: true,
  deleted_by: true,
};

export async function createShippingMethodInDB(data: {
  name: string;
  description?: string | null;
  price: number;
  free_over?: number | null;
  estimated_days_min?: number | null;
  estimated_days_max?: number | null;
  is_active?: boolean;
  sort_order?: number;
  created_by: number;
  updated_by: number;
}) {
  return await prisma.shipping_method.create({
    data,
    select: shippingSelect,
  });
}

export async function updateShippingMethodInDB(
  id: number,
  data: {
    name?: string;
    description?: string | null;
    price?: number;
    free_over?: number | null;
    estimated_days_min?: number | null;
    estimated_days_max?: number | null;
    is_active?: boolean;
    sort_order?: number;
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
) {
  return await prisma.shipping_method.update({
    where: { id },
    data,
    select: shippingSelect,
  });
}

export async function deleteShippingMethodPermanentlyInDB(id: number) {
  return await prisma.shipping_method.delete({
    where: { id },
    select: shippingSelect,
  });
}

export async function bulkUpdateShippingMethodsInDB(
  ids: number[],
  data: {
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
  selectAllScope: boolean = false,
  isTrash: boolean = false,
  filterWhere?: Prisma.shipping_methodWhereInput
) {
  const whereCondition: Prisma.shipping_methodWhereInput = selectAllScope
    ? (filterWhere ?? (isTrash ? { NOT: { deleted_at: null } } : { deleted_at: null }))
    : { id: { in: ids } };

  return await prisma.shipping_method.updateMany({
    where: whereCondition,
    data,
  });
}

export async function bulkDeleteShippingMethodsPermanentlyInDB(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.shipping_methodWhereInput
) {
  const whereCondition: Prisma.shipping_methodWhereInput = selectAllScope
    ? (filterWhere ?? { NOT: { deleted_at: null } })
    : { id: { in: ids } };

  return await prisma.shipping_method.deleteMany({
    where: whereCondition,
  });
}
