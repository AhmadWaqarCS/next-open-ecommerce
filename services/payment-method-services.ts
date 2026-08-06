import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

export async function togglePaymentMethodStatusTransaction(
  id: number,
  is_active: boolean,
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.payment_method.findUnique({ where: { id } });
    if (!existing) throw new Error("Payment method not found.");

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


