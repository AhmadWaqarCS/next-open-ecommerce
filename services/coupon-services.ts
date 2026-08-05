import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function createCouponTransaction(
  data: {
    code: string;
    discount_type: string;
    discount_value: number;
    minimum_order_amount?: number | null;
    max_uses?: number | null;
    max_uses_per_email?: number;
    starts_at?: Date;
    expires_at?: Date | null;
    is_active?: boolean;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    return await tx.coupon.create({
      data: {
        ...data,
        created_by: userId,
        updated_by: userId,
      },
    });
  });
}

export async function updateCouponTransaction(
  id: number,
  data: {
    code?: string;
    discount_type?: string;
    discount_value?: number;
    minimum_order_amount?: number | null;
    max_uses?: number | null;
    max_uses_per_email?: number;
    times_used?: number;
    starts_at?: Date;
    expires_at?: Date | null;
    is_active?: boolean;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.coupon.findUnique({ where: { id } });
    if (!existing) throw new Error("Coupon not found.");

    const updated = await tx.coupon.update({
      where: { id },
      data: { ...data, updated_by: userId },
    });

    return { existing, updated };
  });
}

export async function deleteCouponTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.coupon.findUnique({ where: { id } });
    if (!existing) throw new Error("Coupon not found.");

    await tx.coupon.update({
      where: { id },
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });

    return { existing };
  });
}

export async function restoreCouponTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.coupon.findUnique({ where: { id } });
    if (!existing) throw new Error("Coupon not found.");

    await tx.coupon.update({
      where: { id },
      data: { updated_by: userId, deleted_at: null, deleted_by: null },
    });

    return { existing };
  });
}

export async function permanentlyDeleteCouponTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.coupon.findUnique({ where: { id } });
    if (!existing) throw new Error("Coupon not found.");

    await tx.coupon.delete({ where: { id } });

    return { existing };
  });
}

export async function bulkDeleteCouponsTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.couponWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.couponWhereInput = selectAllScope
      ? (filterWhere ?? { deleted_at: null })
      : { id: { in: ids } };

    return await tx.coupon.updateMany({
      where: whereCondition,
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });
  });
}

export async function bulkRestoreCouponsTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.couponWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.couponWhereInput = selectAllScope
      ? (filterWhere ?? { NOT: { deleted_at: null } })
      : { id: { in: ids } };

    return await tx.coupon.updateMany({
      where: whereCondition,
      data: { updated_by: userId, deleted_at: null, deleted_by: null },
    });
  });
}

export async function bulkPermanentlyDeleteCouponsTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.couponWhereInput,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.couponWhereInput = selectAllScope
      ? (filterWhere ?? { NOT: { deleted_at: null } })
      : { id: { in: ids } };

    return await tx.coupon.deleteMany({
      where: whereCondition,
    });
  });
}
