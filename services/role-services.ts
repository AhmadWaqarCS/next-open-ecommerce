import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function createRoleTransaction(
  data: {
    name: string;
    is_active?: boolean;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const features = await tx.site_feature.findMany({ select: { id: true } });
    const role = await tx.role.create({
      data: {
        name: data.name,
        is_active: data.is_active ?? true,
        created_by: userId,
        updated_by: userId,
        site_feature_roles: {
          createMany: {
            data: features.map((f) => ({
              site_feature_id: f.id,
              access_crud: {
                create: false,
                read: false,
                update: false,
                delete: false,
              },
            })),
          },
        },
      },
    });
    return role;
  });
}

export async function updateRoleTransaction(
  id: number,
  data: {
    name?: string;
    is_active?: boolean;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const targetRole = await tx.role.findUnique({ where: { id } });
    if (!targetRole) throw new Error("ROLE_NOT_FOUND");

    if (targetRole.name === "superadmin") {
      if (data.name && data.name !== "superadmin") {
        throw new Error("SUPERADMIN_NAME_IMMUTABLE");
      }
      if (data.is_active === false) {
        throw new Error("SUPERADMIN_ACTIVE_IMMUTABLE");
      }
    } else {
      if (data.name === "superadmin") {
        throw new Error("CANNOT_RENAME_TO_SUPERADMIN");
      }
    }

    const updatedRole = await tx.role.update({
      where: { id },
      data: {
        name: targetRole.name === "superadmin" ? "superadmin" : data.name,
        is_active: targetRole.name === "superadmin" ? true : data.is_active,
        updated_by: userId,
      },
    });

    return { targetRole, updatedRole };
  });
}

export async function updateRolePermissionsTransaction(
  roleId: number,
  permissions: {
    site_feature_id: number;
    access_crud: {
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
    };
  }[],
) {
  return await prisma.$transaction(async (tx) => {
    const targetRole = await tx.role.findUnique({ where: { id: roleId } });
    if (!targetRole) throw new Error("ROLE_NOT_FOUND");
    if (targetRole.name === "superadmin") throw new Error("SUPERADMIN_PERMISSIONS_IMMUTABLE");

    for (const p of permissions) {
      await tx.site_feature_role.upsert({
        where: {
          site_feature_id_role_id: {
            site_feature_id: p.site_feature_id,
            role_id: roleId,
          },
        },
        update: { access_crud: p.access_crud },
        create: {
          site_feature_id: p.site_feature_id,
          role_id: roleId,
          access_crud: p.access_crud,
        },
      });
    }

    return { targetRole };
  });
}

export async function deleteRoleTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const targetRole = await tx.role.findUnique({ where: { id } });
    if (!targetRole) throw new Error("ROLE_NOT_FOUND");
    if (targetRole.name === "superadmin") throw new Error("CANNOT_DELETE_SUPERADMIN");

    const updatedRole = await tx.role.update({
      where: { id },
      data: {
        updated_by: userId,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });

    return { targetRole, updatedRole };
  });
}

export async function restoreRoleTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const targetRole = await tx.role.findUnique({ where: { id } });
    if (!targetRole) throw new Error("ROLE_NOT_FOUND");

    const updatedRole = await tx.role.update({
      where: { id },
      data: {
        updated_by: userId,
        deleted_at: null,
        deleted_by: null,
      },
    });

    return { targetRole, updatedRole };
  });
}

export async function permanentlyDeleteRoleTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    const targetRole = await tx.role.findUnique({ where: { id } });
    if (!targetRole) throw new Error("ROLE_NOT_FOUND");
    if (targetRole.name === "superadmin") throw new Error("CANNOT_DELETE_SUPERADMIN");

    await tx.site_feature_role.deleteMany({ where: { role_id: id } });
    await tx.role.delete({ where: { id } });

    return { targetRole };
  });
}

export async function bulkDeleteRolesTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.roleWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    let whereCondition: Prisma.roleWhereInput;
    if (selectAllScope) {
      if (filterWhere) {
        whereCondition = { AND: [filterWhere, { NOT: { name: "superadmin" } }] };
      } else {
        whereCondition = { deleted_at: null, NOT: { name: "superadmin" } };
      }
    } else {
      whereCondition = { id: { in: ids }, NOT: { name: "superadmin" } };
    }

    const affected = await tx.role.findMany({
      where: whereCondition,
      select: { id: true, name: true },
    });

    await tx.role.updateMany({
      where: whereCondition,
      data: {
        updated_by: userId,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });

    return { affected };
  });
}

export async function bulkRestoreRolesTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.roleWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    let whereCondition: Prisma.roleWhereInput;
    if (selectAllScope) {
      if (filterWhere) {
        whereCondition = { AND: [filterWhere, { NOT: { name: "superadmin" } }] };
      } else {
        whereCondition = { NOT: [{ name: "superadmin" }, { deleted_at: null }] };
      }
    } else {
      whereCondition = { id: { in: ids }, NOT: { name: "superadmin" } };
    }

    const affected = await tx.role.findMany({
      where: whereCondition,
      select: { id: true, name: true },
    });

    await tx.role.updateMany({
      where: whereCondition,
      data: {
        updated_by: userId,
        deleted_at: null,
        deleted_by: null,
      },
    });

    return { affected };
  });
}

export async function bulkPermanentlyDeleteRolesTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.roleWhereInput,
) {
  return await prisma.$transaction(async (tx) => {
    let whereCondition: Prisma.roleWhereInput;
    if (selectAllScope) {
      if (filterWhere) {
        whereCondition = { AND: [filterWhere, { NOT: { name: "superadmin" } }] };
      } else {
        whereCondition = { NOT: [{ name: "superadmin" }, { deleted_at: null }] };
      }
    } else {
      whereCondition = { id: { in: ids }, NOT: { name: "superadmin" } };
    }

    const affected = await tx.role.findMany({
      where: whereCondition,
      select: { id: true, name: true },
    });

    const affectedIds = affected.map((r) => r.id);
    if (affectedIds.length > 0) {
      await tx.site_feature_role.deleteMany({
        where: { role_id: { in: affectedIds } },
      });
      await tx.role.deleteMany({
        where: { id: { in: affectedIds } },
      });
    }

    return { affected };
  });
}
