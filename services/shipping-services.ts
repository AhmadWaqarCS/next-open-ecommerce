import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function createShippingMethodTransaction(
  data: {
    name: string;
    description?: string | null;
    price: number;
    free_over?: number | null;
    estimated_days_min?: number | null;
    estimated_days_max?: number | null;
    is_active?: boolean;
    sort_order?: number;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    return await tx.shipping_method.create({
      data: {
        ...data,
        created_by: userId,
        updated_by: userId,
      },
    });
  });
}

export async function updateShippingMethodTransaction(
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
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.shipping_method.findUnique({ where: { id } });
    if (!existing) throw new Error("Shipping method not found.");

    const updated = await tx.shipping_method.update({
      where: { id },
      data: { ...data, updated_by: userId },
    });

    return { existing, updated };
  });
}

export async function deleteShippingMethodTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.shipping_method.findUnique({ where: { id } });
    if (!existing) throw new Error("Shipping method not found.");

    await tx.shipping_method.update({
      where: { id },
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });

    return { existing };
  });
}

export async function restoreShippingMethodTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.shipping_method.findUnique({ where: { id } });
    if (!existing) throw new Error("Shipping method not found.");

    await tx.shipping_method.update({
      where: { id },
      data: { updated_by: userId, deleted_at: null, deleted_by: null },
    });

    return { existing };
  });
}

export async function permanentlyDeleteShippingMethodTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.shipping_method.findUnique({ where: { id } });
    if (!existing) throw new Error("Shipping method not found.");

    await tx.shipping_method.delete({ where: { id } });

    return { existing };
  });
}

export async function bulkDeleteShippingMethodsTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.shipping_methodWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.shipping_methodWhereInput = selectAllScope
      ? (filterWhere ?? { deleted_at: null })
      : { id: { in: ids } };

    return await tx.shipping_method.updateMany({
      where: whereCondition,
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });
  });
}

export async function bulkRestoreShippingMethodsTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.shipping_methodWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.shipping_methodWhereInput = selectAllScope
      ? (filterWhere ?? { NOT: { deleted_at: null } })
      : { id: { in: ids } };

    return await tx.shipping_method.updateMany({
      where: whereCondition,
      data: { updated_by: userId, deleted_at: null, deleted_by: null },
    });
  });
}

export async function bulkPermanentlyDeleteShippingMethodsTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.shipping_methodWhereInput,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.shipping_methodWhereInput = selectAllScope
      ? (filterWhere ?? { NOT: { deleted_at: null } })
      : { id: { in: ids } };

    return await tx.shipping_method.deleteMany({
      where: whereCondition,
    });
  });
}

export async function getShippingDashboardDataInDB(
  whereCondition: Prisma.shipping_methodWhereInput,
  skipCount: number,
  pageSize: number,
) {
  return await prisma.$transaction(async (tx) => {
    const shippingMethods = await tx.shipping_method.findMany({
      where: whereCondition,
      take: pageSize,
      skip: skipCount,
      orderBy: { sort_order: "asc" },
    });

    const totalShippingMethods = await tx.shipping_method.count({ where: whereCondition });

    const dashboardUsers = await tx.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return { shippingMethods, totalShippingMethods, dashboardUsers };
  });
}

export async function getShippingEditDataInDB(id: number) {
  return await prisma.shipping_method.findUnique({
    where: { id, deleted_at: null },
  });
}

export async function getShippingTrashDashboardDataInDB(
  whereCondition: Prisma.shipping_methodWhereInput,
  skipCount: number,
  pageSize: number,
) {
  return await prisma.$transaction(async (tx) => {
    const shippingMethods = await tx.shipping_method.findMany({
      where: whereCondition,
      take: pageSize,
      skip: skipCount,
      orderBy: { deleted_at: "desc" },
    });

    const totalShippingMethods = await tx.shipping_method.count({ where: whereCondition });

    const dashboardUsers = await tx.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return { shippingMethods, totalShippingMethods, dashboardUsers };
  });
}

