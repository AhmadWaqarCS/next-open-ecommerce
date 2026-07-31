import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

// ─── MUTATIONS ONLY ──────────────────────────────────────────────────────────

export async function createCouponInDB(data: {
  code: string;
  discount_type: string;
  discount_value: number;
  minimum_order_amount?: number | null;
  max_uses?: number | null;
  max_uses_per_email?: number;
  starts_at?: Date;
  expires_at?: Date | null;
  is_active?: boolean;
  created_by: number;
  updated_by: number;
}) {
  return await prisma.coupon.create({ data });
}

export async function updateCouponInDB(
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
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
) {
  return await prisma.coupon.update({ where: { id }, data });
}

export async function deleteCouponPermanentlyInDB(id: number) {
  return await prisma.coupon.delete({ where: { id } });
}

export async function bulkUpdateCouponsInDB(
  ids: number[],
  data: {
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
  selectAllScope: boolean = false,
  isTrash: boolean = false,
  filterWhere?: Prisma.couponWhereInput,
) {
  const whereCondition: Prisma.couponWhereInput = selectAllScope
    ? (filterWhere ??
      (isTrash ? { NOT: { deleted_at: null } } : { deleted_at: null }))
    : { id: { in: ids } };

  return await prisma.coupon.updateMany({
    where: whereCondition,
    data,
  });
}

export async function bulkDeleteCouponsPermanentlyInDB(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.couponWhereInput,
) {
  const whereCondition: Prisma.couponWhereInput = selectAllScope
    ? (filterWhere ?? { NOT: { deleted_at: null } })
    : { id: { in: ids } };

  return await prisma.coupon.deleteMany({
    where: whereCondition,
  });
}
