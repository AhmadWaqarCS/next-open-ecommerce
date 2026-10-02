import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { PaymentMethodUpdateInput } from "@/lib/validations";

export async function getPaymentMethodByIdInDB(id: number) {
  return await prisma.payment_method.findUnique({
    where: { id },
  });
}

export async function togglePaymentMethodStatusTransaction(
  id: number,
  is_active: boolean,
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.payment_method.findUnique({ where: { id } });
    if (!existing) throw new Error("Payment method not found.");

    // Core Business Invariant: At least one payment method must remain active
    if (!is_active && existing.is_active) {
      const activeCount = await tx.payment_method.count({
        where: { is_active: true, id: { not: id } },
      });
      if (activeCount === 0) {
        throw new Error(
          "At least one payment method must remain active to allow storefront checkout.",
        );
      }
    }

    const updated = await tx.payment_method.update({
      where: { id },
      data: {
        is_active,
        updated_by: userId,
      },
    });

    return { existing, updated };
  });
}

export async function updatePaymentMethodTransaction(
  id: number,
  data: PaymentMethodUpdateInput,
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.payment_method.findUnique({ where: { id } });
    if (!existing) throw new Error("Payment method not found.");

    // Core Business Invariant: At least one payment method must remain active
    if (data.is_active === false && existing.is_active) {
      const activeCount = await tx.payment_method.count({
        where: { is_active: true, id: { not: id } },
      });
      if (activeCount === 0) {
        throw new Error(
          "At least one payment method must remain active to allow storefront checkout.",
        );
      }
    }

    // Field diffing: update only changed values
    const updateData: Prisma.payment_methodUpdateInput = {
      updated_by: userId,
    };

    if (data.name !== undefined && data.name !== existing.name) {
      updateData.name = data.name;
    }
    if (data.description !== undefined && data.description !== existing.description) {
      updateData.description = data.description;
    }
    if (data.extra_charge !== undefined) {
      const newCharge = data.extra_charge != null ? new Prisma.Decimal(data.extra_charge) : null;
      const oldCharge = existing.extra_charge != null ? new Prisma.Decimal(existing.extra_charge) : null;
      if (!newCharge && oldCharge) {
        updateData.extra_charge = null;
      } else if (newCharge && (!oldCharge || !newCharge.equals(oldCharge))) {
        updateData.extra_charge = newCharge;
      }
    }
    if (data.instructions !== undefined && data.instructions !== existing.instructions) {
      updateData.instructions = data.instructions;
    }
    if (data.sort_order !== undefined && data.sort_order !== existing.sort_order) {
      updateData.sort_order = data.sort_order;
    }
    if (data.is_active !== undefined && data.is_active !== existing.is_active) {
      updateData.is_active = data.is_active;
    }

    const updated = await tx.payment_method.update({
      where: { id },
      data: updateData,
    });

    return { existing, updated };
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
