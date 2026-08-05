import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function createUserTransaction(
  data: {
    email: string;
    password: string;
    role_name: string;
    is_active: boolean;
    name?: string | null;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    return await tx.dashboard_user.create({
      data: {
        ...data,
        role: { connect: { name: data.role_name } },
        created_by: userId,
        updated_by: userId,
      },
    });
  });
}

export async function updateUserTransaction(
  id: number,
  data: {
    email?: string;
    password?: string;
    role_name?: string;
    is_active?: boolean;
    name?: string | null;
  },
  currentUserId: number,
  currentUserRole: string,
) {
  return await prisma.$transaction(async (tx) => {
    const targetUser = await tx.dashboard_user.findUnique({ where: { id } });
    if (!targetUser) throw new Error("USER_NOT_FOUND");

    const isSuperadmin = targetUser.role_name === "superadmin";

    if (isSuperadmin) {
      if (currentUserRole !== "superadmin") {
        throw new Error("ONLY_SUPERADMIN_CAN_MODIFY");
      }
      if (data.role_name && data.role_name !== "superadmin") {
        throw new Error("SUPERADMIN_ROLE_IMMUTABLE");
      }
      if (data.is_active === false) {
        throw new Error("SUPERADMIN_ACTIVE_IMMUTABLE");
      }
    } else {
      if (data.role_name === "superadmin") {
        throw new Error("CANNOT_PROMOTE_TO_SUPERADMIN");
      }
    }

    const updatedUser = await tx.dashboard_user.update({
      where: { id },
      data: {
        ...data,
        role_name: isSuperadmin
          ? "superadmin"
          : data.role_name !== ""
            ? data.role_name
            : undefined,
        ...(data.role_name && {
          role: { connect: { name: isSuperadmin ? "superadmin" : data.role_name } },
        }),
        is_active: isSuperadmin ? true : data.is_active,
        updated_by: currentUserId,
      },
    });

    return { targetUser, updatedUser };
  });
}

export async function deleteUserTransaction(
  id: number,
  currentUserId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const targetUser = await tx.dashboard_user.findUnique({ where: { id } });
    if (!targetUser) throw new Error("USER_NOT_FOUND");
    if (targetUser.role_name === "superadmin") throw new Error("CANNOT_DELETE_SUPERADMIN");

    const updatedUser = await tx.dashboard_user.update({
      where: { id },
      data: {
        updated_by: currentUserId,
        deleted_at: new Date(),
        deleted_by: currentUserId,
      },
    });

    return { targetUser, updatedUser };
  });
}

export async function restoreUserTransaction(
  id: number,
  currentUserId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const targetUser = await tx.dashboard_user.findUnique({ where: { id } });
    if (!targetUser) throw new Error("USER_NOT_FOUND");
    if (targetUser.role_name === "superadmin") throw new Error("CANNOT_RESTORE_SUPERADMIN");

    const updatedUser = await tx.dashboard_user.update({
      where: { id },
      data: {
        updated_by: currentUserId,
        deleted_at: null,
        deleted_by: null,
      },
    });

    return { targetUser, updatedUser };
  });
}

export async function permanentlyDeleteUserTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    const targetUser = await tx.dashboard_user.findUnique({ where: { id } });
    if (!targetUser) throw new Error("USER_NOT_FOUND");
    if (targetUser.role_name === "superadmin") throw new Error("CANNOT_DELETE_SUPERADMIN");

    await tx.dashboard_user.delete({
      where: { id, NOT: { role_name: "superadmin" } },
    });

    return { targetUser };
  });
}

export async function bulkDeleteUsersTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.dashboard_userWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    let whereCondition: Prisma.dashboard_userWhereInput;
    if (selectAllScope) {
      if (filterWhere) {
        whereCondition = { AND: [filterWhere, { NOT: { role_name: "superadmin" } }] };
      } else {
        whereCondition = { deleted_at: null, NOT: { role_name: "superadmin" } };
      }
    } else {
      whereCondition = { id: { in: ids }, NOT: { role_name: "superadmin" } };
    }

    return await tx.dashboard_user.updateMany({
      where: whereCondition,
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });
  });
}

export async function bulkRestoreUsersTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.dashboard_userWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    let whereCondition: Prisma.dashboard_userWhereInput;
    if (selectAllScope) {
      if (filterWhere) {
        whereCondition = { AND: [filterWhere, { NOT: { role_name: "superadmin" } }] };
      } else {
        whereCondition = { NOT: [{ role_name: "superadmin" }, { deleted_at: null }] };
      }
    } else {
      whereCondition = { id: { in: ids }, NOT: { role_name: "superadmin" } };
    }

    return await tx.dashboard_user.updateMany({
      where: whereCondition,
      data: { updated_by: userId, deleted_at: null, deleted_by: null },
    });
  });
}

export async function bulkPermanentlyDeleteUsersTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.dashboard_userWhereInput,
) {
  return await prisma.$transaction(async (tx) => {
    let whereCondition: Prisma.dashboard_userWhereInput;
    if (selectAllScope) {
      if (filterWhere) {
        whereCondition = { AND: [filterWhere, { NOT: { role_name: "superadmin" } }] };
      } else {
        whereCondition = { NOT: [{ role_name: "superadmin" }, { deleted_at: null }] };
      }
    } else {
      whereCondition = { id: { in: ids }, NOT: { role_name: "superadmin" } };
    }

    return await tx.dashboard_user.deleteMany({
      where: whereCondition,
    });
  });
}
