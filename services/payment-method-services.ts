import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

export async function createPaymentMethodTransaction(
  data: {
    name: string;
    description?: string | null;
    provider: string;
    provider_config?: Record<string, unknown> | null;
    extra_charge?: number | null;
    instructions?: string | null;
    is_active?: boolean;
    sort_order?: number;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    return await tx.payment_method.create({
      data: {
        ...data,
        provider_config: (data.provider_config as any) ?? Prisma.JsonNull,
        created_by: userId,
        updated_by: userId,
      },
    });
  });
}

export async function updatePaymentMethodTransaction(
  id: number,
  data: {
    name?: string;
    description?: string | null;
    provider?: string;
    provider_config?: Record<string, unknown> | null;
    extra_charge?: number | null;
    instructions?: string | null;
    is_active?: boolean;
    sort_order?: number;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.payment_method.findUnique({ where: { id } });
    if (!existing) throw new Error("Payment method not found.");

    const updated = await tx.payment_method.update({
      where: { id },
      data: {
        ...data,
        provider_config:
          data.provider_config !== undefined
            ? ((data.provider_config as any) ?? Prisma.JsonNull)
            : undefined,
        updated_by: userId,
      },
    });

    return { existing, updated };
  });
}

export async function deletePaymentMethodTransaction(
  id: number,
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.payment_method.findUnique({ where: { id } });
    if (!existing) throw new Error("Payment method not found.");

    await tx.payment_method.update({
      where: { id },
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });

    return { existing };
  });
}

export async function restorePaymentMethodTransaction(
  id: number,
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.payment_method.findUnique({ where: { id } });
    if (!existing) throw new Error("Payment method not found.");

    await tx.payment_method.update({
      where: { id },
      data: { updated_by: userId, deleted_at: null, deleted_by: null },
    });

    return { existing };
  });
}

export async function permanentlyDeletePaymentMethodTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.payment_method.findUnique({ where: { id } });
    if (!existing) throw new Error("Payment method not found.");

    await tx.payment_method.delete({ where: { id } });

    return { existing };
  });
}

export async function bulkDeletePaymentMethodsTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.payment_methodWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.payment_methodWhereInput = selectAllScope
      ? (filterWhere ?? { deleted_at: null })
      : { id: { in: ids } };

    return await tx.payment_method.updateMany({
      where: whereCondition,
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });
  });
}

export async function bulkRestorePaymentMethodsTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.payment_methodWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.payment_methodWhereInput = selectAllScope
      ? (filterWhere ?? { NOT: { deleted_at: null } })
      : { id: { in: ids } };

    return await tx.payment_method.updateMany({
      where: whereCondition,
      data: { updated_by: userId, deleted_at: null, deleted_by: null },
    });
  });
}

export async function bulkPermanentlyDeletePaymentMethodsTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.payment_methodWhereInput,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.payment_methodWhereInput = selectAllScope
      ? (filterWhere ?? { NOT: { deleted_at: null } })
      : { id: { in: ids } };

    return await tx.payment_method.deleteMany({
      where: whereCondition,
    });
  });
}

export async function getPaymentMethodsDashboardDataInDB(
  whereCondition: Prisma.payment_methodWhereInput,
  skipCount: number,
  pageSize: number,
) {
  return await prisma.$transaction(async (tx) => {
    const paymentMethods = await tx.payment_method.findMany({
      where: whereCondition,
      take: pageSize,
      skip: skipCount,
      orderBy: { sort_order: "asc" },
    });

    const totalPaymentMethods = await tx.payment_method.count({ where: whereCondition });

    const dashboardUsers = await tx.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return { paymentMethods, totalPaymentMethods, dashboardUsers };
  });
}

export async function getPaymentMethodEditDataInDB(id: number) {
  return await prisma.payment_method.findUnique({
    where: { id, deleted_at: null },
  });
}

export async function getPaymentMethodTrashDashboardDataInDB(
  whereCondition: Prisma.payment_methodWhereInput,
  skipCount: number,
  pageSize: number,
) {
  return await prisma.$transaction(async (tx) => {
    const paymentMethods = await tx.payment_method.findMany({
      where: whereCondition,
      take: pageSize,
      skip: skipCount,
      orderBy: { deleted_at: "desc" },
    });

    const totalPaymentMethods = await tx.payment_method.count({ where: whereCondition });

    const dashboardUsers = await tx.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return { paymentMethods, totalPaymentMethods, dashboardUsers };
  });
}

