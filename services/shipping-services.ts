import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Asserts that at least one active, non-deleted shipping method remains in the database.
 * Throws an error if the count of remaining active methods would fall below 1.
 */
async function assertAtLeastOneActiveShippingMethod(
  tx: Prisma.TransactionClient,
  excludingIds: number[] = [],
  errorMessage = "Cannot complete this operation. At least one shipping method must remain active for the storefront.",
) {
  const remainingActiveCount = await tx.shipping_method.count({
    where: {
      is_active: true,
      deleted_at: null,
      ...(excludingIds.length > 0 ? { id: { notIn: excludingIds } } : {}),
    },
  });

  if (remainingActiveCount < 1) {
    throw new Error(errorMessage);
  }
}

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
        name: data.name,
        description: data.description ?? null,
        price: data.price,
        free_over: data.free_over ?? null,
        estimated_days_min: data.estimated_days_min ?? null,
        estimated_days_max: data.estimated_days_max ?? null,
        is_active: data.is_active ?? true,
        sort_order: data.sort_order ?? 0,
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
    const existing = await tx.shipping_method.findUnique({
      where: { id },
    });
    if (!existing) throw new Error("Shipping method not found.");

    // Enforce invariant: If deactivating an active method, ensure another active method exists
    if (data.is_active === false && existing.is_active === true && existing.deleted_at === null) {
      await assertAtLeastOneActiveShippingMethod(
        tx,
        [id],
        "Cannot deactivate this shipping method. At least one shipping method must remain active for the storefront.",
      );
    }

    // Field diffing: only update fields that actually changed
    const updatePayload: Prisma.shipping_methodUpdateInput = {
      updated_by: userId,
    };

    if (data.name !== undefined && data.name !== existing.name) {
      updatePayload.name = data.name;
    }
    if (data.description !== undefined && data.description !== existing.description) {
      updatePayload.description = data.description;
    }
    if (data.price !== undefined && Number(data.price) !== Number(existing.price)) {
      updatePayload.price = data.price;
    }
    if (data.free_over !== undefined) {
      const newFreeOver = data.free_over ?? null;
      const existingFreeOver = existing.free_over !== null ? Number(existing.free_over) : null;
      if (newFreeOver !== existingFreeOver) {
        updatePayload.free_over = newFreeOver;
      }
    }
    if (data.estimated_days_min !== undefined && data.estimated_days_min !== existing.estimated_days_min) {
      updatePayload.estimated_days_min = data.estimated_days_min;
    }
    if (data.estimated_days_max !== undefined && data.estimated_days_max !== existing.estimated_days_max) {
      updatePayload.estimated_days_max = data.estimated_days_max;
    }
    if (data.is_active !== undefined && data.is_active !== existing.is_active) {
      updatePayload.is_active = data.is_active;
    }
    if (data.sort_order !== undefined && data.sort_order !== existing.sort_order) {
      updatePayload.sort_order = data.sort_order;
    }

    const updated = await tx.shipping_method.update({
      where: { id },
      data: updatePayload,
    });

    return { existing, updated };
  });
}

export async function toggleShippingMethodStatusTransaction(
  id: number,
  isActive: boolean,
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.shipping_method.findUnique({
      where: { id },
    });
    if (!existing) throw new Error("Shipping method not found.");

    // If deactivating, assert at least one other active shipping method exists
    if (!isActive && existing.is_active && existing.deleted_at === null) {
      await assertAtLeastOneActiveShippingMethod(
        tx,
        [id],
        "Cannot deactivate this shipping method. At least one shipping method must remain active for the storefront.",
      );
    }

    const updated = await tx.shipping_method.update({
      where: { id },
      data: {
        is_active: isActive,
        updated_by: userId,
      },
    });

    return { existing, updated };
  });
}

export async function deleteShippingMethodTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.shipping_method.findUnique({ where: { id } });
    if (!existing) throw new Error("Shipping method not found.");

    // If deleting an active method, assert at least one other active shipping method exists
    if (existing.is_active && existing.deleted_at === null) {
      await assertAtLeastOneActiveShippingMethod(
        tx,
        [id],
        "Cannot delete this shipping method. At least one shipping method must remain active for the storefront.",
      );
    }

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

    // Foreign key safety check: verify if any orders reference this shipping method
    const orderCount = await tx.order.count({
      where: { shipping_method_id: id },
    });
    if (orderCount > 0) {
      throw new Error(
        `Cannot permanently delete "${existing.name}" because ${orderCount} order(s) are associated with it. Soft-deleted methods can remain safely in the trash bin for historical integrity.`,
      );
    }

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
      : { id: { in: ids }, deleted_at: null };

    // Find all active methods that would be deleted by this operation
    const methodsToDelete = await tx.shipping_method.findMany({
      where: whereCondition,
      select: { id: true, is_active: true },
    });

    const activeIdsToDelete = methodsToDelete
      .filter((m) => m.is_active)
      .map((m) => m.id);

    if (activeIdsToDelete.length > 0) {
      await assertAtLeastOneActiveShippingMethod(
        tx,
        activeIdsToDelete,
        "Cannot delete the selected shipping methods. At least one shipping method must remain active for the storefront.",
      );
    }

    return await tx.shipping_method.updateMany({
      where: whereCondition,
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });
  });
}

export async function bulkSetShippingMethodsStatusTransaction(
  ids: number[],
  isActive: boolean,
  selectAllScope: boolean = false,
  filterWhere?: Prisma.shipping_methodWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.shipping_methodWhereInput = selectAllScope
      ? (filterWhere ?? { deleted_at: null })
      : { id: { in: ids }, deleted_at: null };

    // If deactivating, ensure active methods outside this selection remain
    if (!isActive) {
      const targetMethods = await tx.shipping_method.findMany({
        where: whereCondition,
        select: { id: true, is_active: true },
      });

      const activeIdsToDeactivate = targetMethods
        .filter((m) => m.is_active)
        .map((m) => m.id);

      if (activeIdsToDeactivate.length > 0) {
        await assertAtLeastOneActiveShippingMethod(
          tx,
          activeIdsToDeactivate,
          "Cannot deactivate the selected shipping methods. At least one shipping method must remain active for the storefront.",
        );
      }
    }

    return await tx.shipping_method.updateMany({
      where: whereCondition,
      data: { is_active: isActive, updated_by: userId },
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

    const candidateMethods = await tx.shipping_method.findMany({
      where: whereCondition,
      select: { id: true, name: true },
    });

    if (candidateMethods.length === 0) {
      return { count: 0, skippedCount: 0 };
    }

    const candidateIds = candidateMethods.map((m) => m.id);

    // Identify which methods are referenced in orders
    const ordersWithMethods = await tx.order.findMany({
      where: { shipping_method_id: { in: candidateIds } },
      select: { shipping_method_id: true },
      distinct: ["shipping_method_id"],
    });

    const blockedIds = new Set(
      ordersWithMethods
        .map((o) => o.shipping_method_id)
        .filter((id): id is number => id !== null),
    );

    const deletableIds = candidateIds.filter((id) => !blockedIds.has(id));

    if (deletableIds.length === 0) {
      throw new Error(
        `None of the selected shipping methods can be permanently deleted because all of them are associated with existing orders. Soft-deleted methods safely remain in the trash bin.`,
      );
    }

    const result = await tx.shipping_method.deleteMany({
      where: { id: { in: deletableIds } },
    });

    return {
      count: result.count,
      skippedCount: blockedIds.size,
    };
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
      orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    });

    const totalShippingMethods = await tx.shipping_method.count({
      where: whereCondition,
    });

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

    const totalShippingMethods = await tx.shipping_method.count({
      where: whereCondition,
    });

    const dashboardUsers = await tx.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return { shippingMethods, totalShippingMethods, dashboardUsers };
  });
}
