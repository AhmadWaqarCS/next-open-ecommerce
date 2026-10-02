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
    const cleanCode = data.code.trim().toUpperCase();

    // 1. Uniqueness check
    const existing = await tx.coupon.findUnique({
      where: { code: cleanCode },
    });
    if (existing) {
      throw new Error("COUPON_CODE_EXISTS");
    }

    // 2. Percentage check
    if (data.discount_type === "percentage" && data.discount_value > 100) {
      throw new Error("COUPON_PERCENTAGE_OVER_100");
    }

    return await tx.coupon.create({
      data: {
        code: cleanCode,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        minimum_order_amount: data.minimum_order_amount ?? null,
        max_uses: data.max_uses ?? null,
        max_uses_per_email: data.max_uses_per_email ?? 1,
        times_used: 0,
        starts_at: data.starts_at ?? new Date(),
        expires_at: data.expires_at ?? null,
        is_active: data.is_active ?? true,
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
    if (!existing) throw new Error("COUPON_NOT_FOUND");

    // 1. Code uniqueness check if changed
    if (data.code) {
      const cleanCode = data.code.trim().toUpperCase();
      if (cleanCode !== existing.code) {
        const duplicate = await tx.coupon.findUnique({
          where: { code: cleanCode },
        });
        if (duplicate && duplicate.id !== id) {
          throw new Error("COUPON_CODE_EXISTS");
        }
      }
    }

    // 2. Usage limit check
    if (
      data.max_uses !== undefined &&
      data.max_uses !== null &&
      data.max_uses < existing.times_used
    ) {
      throw new Error("COUPON_MAX_USES_BELOW_USAGE");
    }

    // 3. Percentage limit check
    const effectiveType = data.discount_type ?? existing.discount_type;
    const effectiveValue =
      data.discount_value !== undefined
        ? data.discount_value
        : Number(existing.discount_value);
    if (effectiveType === "percentage" && effectiveValue > 100) {
      throw new Error("COUPON_PERCENTAGE_OVER_100");
    }

    // 4. Selective diffing
    const updateData: Prisma.couponUpdateInput = {
      updated_by: userId,
    };

    if (data.code !== undefined) {
      updateData.code = data.code.trim().toUpperCase();
    }
    if (data.discount_type !== undefined) {
      updateData.discount_type = data.discount_type;
    }
    if (data.discount_value !== undefined) {
      updateData.discount_value = data.discount_value;
    }
    if (data.minimum_order_amount !== undefined) {
      updateData.minimum_order_amount = data.minimum_order_amount;
    }
    if (data.max_uses !== undefined) {
      updateData.max_uses = data.max_uses;
    }
    if (data.max_uses_per_email !== undefined) {
      updateData.max_uses_per_email = data.max_uses_per_email;
    }
    if (data.times_used !== undefined) {
      updateData.times_used = data.times_used;
    }
    if (data.starts_at !== undefined) {
      updateData.starts_at = data.starts_at;
    }
    if (data.expires_at !== undefined) {
      updateData.expires_at = data.expires_at;
    }
    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    const updated = await tx.coupon.update({
      where: { id },
      data: updateData,
    });

    return { existing, updated };
  });
}

export async function toggleCouponStatusTransaction(
  id: number,
  is_active: boolean,
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.coupon.findUnique({ where: { id } });
    if (!existing) throw new Error("COUPON_NOT_FOUND");

    const updated = await tx.coupon.update({
      where: { id },
      data: {
        is_active,
        updated_by: userId,
      },
    });

    return { existing, updated };
  });
}

export async function deleteCouponTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.coupon.findUnique({ where: { id } });
    if (!existing) throw new Error("COUPON_NOT_FOUND");

    const updated = await tx.coupon.update({
      where: { id },
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });

    return { existing: updated };
  });
}

export async function restoreCouponTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.coupon.findUnique({ where: { id } });
    if (!existing) throw new Error("COUPON_NOT_FOUND");

    const updated = await tx.coupon.update({
      where: { id },
      data: { updated_by: userId, deleted_at: null, deleted_by: null },
    });

    return { existing: updated };
  });
}

export async function permanentlyDeleteCouponTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.coupon.findUnique({ where: { id } });
    if (!existing) throw new Error("COUPON_NOT_FOUND");

    // Foreign-key integrity check: prevent deleting coupon associated with completed orders
    const orderCount = await tx.order.count({
      where: { coupon_id: id },
    });

    if (orderCount > 0) {
      throw new Error(`COUPON_HAS_ORDERS:${orderCount}`);
    }

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

export async function bulkSetCouponsStatusTransaction(
  ids: number[],
  is_active: boolean,
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
      data: { is_active, updated_by: userId },
    });
  });
}

export async function bulkPermanentlyDeleteCouponsTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.couponWhereInput,
) {
  return await prisma.$transaction(async (tx) => {
    const baseWhere: Prisma.couponWhereInput = selectAllScope
      ? (filterWhere ?? { NOT: { deleted_at: null } })
      : { id: { in: ids } };

    // Fetch all matching coupons to check which ones have orders
    const candidateCoupons = await tx.coupon.findMany({
      where: baseWhere,
      select: {
        id: true,
        _count: {
          select: { orders: true },
        },
      },
    });

    const safeToDeleteIds = candidateCoupons
      .filter((c) => c._count.orders === 0)
      .map((c) => c.id);

    const skippedCount = candidateCoupons.length - safeToDeleteIds.length;

    if (safeToDeleteIds.length > 0) {
      await tx.coupon.deleteMany({
        where: { id: { in: safeToDeleteIds } },
      });
    }

    return {
      deletedCount: safeToDeleteIds.length,
      skippedCount,
    };
  });
}

export async function getCouponsDashboardDataInDB(
  whereCondition: Prisma.couponWhereInput,
  skipCount: number,
  pageSize: number,
) {
  return await prisma.$transaction(async (tx) => {
    const couponsRaw = await tx.coupon.findMany({
      where: whereCondition,
      take: pageSize,
      skip: skipCount,
      orderBy: { created_at: "desc" },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    const totalCoupons = await tx.coupon.count({ where: whereCondition });

    const dashboardUsers = await tx.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return { couponsRaw, totalCoupons, dashboardUsers };
  });
}

export async function getCouponEditDataInDB(couponId: number) {
  return await prisma.coupon.findUnique({
    where: { id: couponId, deleted_at: null },
    include: {
      _count: {
        select: { orders: true },
      },
    },
  });
}

export async function getCouponTrashDashboardDataInDB(
  whereCondition: Prisma.couponWhereInput,
  skipCount: number,
  pageSize: number,
) {
  return await prisma.$transaction(async (tx) => {
    const couponsRaw = await tx.coupon.findMany({
      where: whereCondition,
      take: pageSize,
      skip: skipCount,
      orderBy: { deleted_at: "desc" },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    const totalCoupons = await tx.coupon.count({ where: whereCondition });

    const dashboardUsers = await tx.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return { couponsRaw, totalCoupons, dashboardUsers };
  });
}
