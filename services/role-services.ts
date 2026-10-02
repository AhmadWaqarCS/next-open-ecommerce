import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function createRoleTransaction(
  data: {
    name: string;
    is_active?: boolean;
  },
  userId: number,
) {
  const trimmedName = data.name.trim();

  if (trimmedName.toLowerCase() === "superadmin") {
    throw new Error("CANNOT_CREATE_SUPERADMIN");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Check for role name collision (case-insensitive)
    const existing = await tx.role.findFirst({
      where: {
        name: { equals: trimmedName, mode: "insensitive" },
      },
    });

    if (existing) {
      throw new Error("ROLE_NAME_EXISTS");
    }

    // 2. Fetch active site features to initialize default permissions
    const features = await tx.site_feature.findMany({
      where: { enabled: true },
      select: { id: true },
    });

    // 3. Create the role with all site feature permissions initialized to false
    const role = await tx.role.create({
      data: {
        name: trimmedName,
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

    const isSuperadmin = targetRole.name.toLowerCase() === "superadmin";

    if (isSuperadmin) {
      if (data.name && data.name.trim().toLowerCase() !== "superadmin") {
        throw new Error("SUPERADMIN_NAME_IMMUTABLE");
      }
      if (data.is_active === false) {
        throw new Error("SUPERADMIN_ACTIVE_IMMUTABLE");
      }
    } else {
      if (data.name && data.name.trim().toLowerCase() === "superadmin") {
        throw new Error("CANNOT_RENAME_TO_SUPERADMIN");
      }
    }

    // Check name collision if name is being changed
    if (data.name !== undefined) {
      const trimmedName = data.name.trim();
      if (trimmedName.toLowerCase() !== targetRole.name.toLowerCase()) {
        const collision = await tx.role.findFirst({
          where: {
            id: { not: id },
            name: { equals: trimmedName, mode: "insensitive" },
          },
        });
        if (collision) {
          throw new Error("ROLE_NAME_EXISTS");
        }
      }
    }

    // Diff changed fields per SERVICES.md guidelines
    const updateData: Prisma.roleUpdateInput = {
      updated_by: userId,
    };

    if (data.name !== undefined && !isSuperadmin) {
      const trimmed = data.name.trim();
      if (trimmed !== targetRole.name) {
        updateData.name = trimmed;
      }
    }

    if (data.is_active !== undefined && !isSuperadmin) {
      if (data.is_active !== targetRole.is_active) {
        updateData.is_active = data.is_active;
      }
    }

    const updatedRole = await tx.role.update({
      where: { id },
      data: updateData,
    });

    return { targetRole, updatedRole };
  });
}

export async function toggleRoleStatusTransaction(
  id: number,
  is_active: boolean,
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const targetRole = await tx.role.findUnique({ where: { id } });
    if (!targetRole) throw new Error("ROLE_NOT_FOUND");

    if (targetRole.name.toLowerCase() === "superadmin" && !is_active) {
      throw new Error("SUPERADMIN_ACTIVE_IMMUTABLE");
    }

    if (targetRole.is_active === is_active) {
      return { targetRole, updatedRole: targetRole };
    }

    const updatedRole = await tx.role.update({
      where: { id },
      data: {
        is_active,
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
    if (targetRole.name.toLowerCase() === "superadmin") {
      throw new Error("SUPERADMIN_PERMISSIONS_IMMUTABLE");
    }

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
    if (targetRole.name.toLowerCase() === "superadmin") {
      throw new Error("CANNOT_DELETE_SUPERADMIN");
    }

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
    if (targetRole.name.toLowerCase() === "superadmin") {
      throw new Error("CANNOT_DELETE_SUPERADMIN");
    }

    // Check if any users are assigned to this role before permanent deletion
    const assignedUsersCount = await tx.dashboard_user.count({
      where: { role_id: id },
    });

    if (assignedUsersCount > 0) {
      throw new Error("ROLE_HAS_ASSIGNED_USERS");
    }

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

    const candidateRoles = await tx.role.findMany({
      where: whereCondition,
      select: { id: true, name: true },
    });

    const candidateIds = candidateRoles.map((r) => r.id);
    if (candidateIds.length === 0) {
      return { affected: [], blockedCount: 0 };
    }

    // Check which candidate roles have assigned users
    const usersWithRoles = await tx.dashboard_user.findMany({
      where: { role_id: { in: candidateIds } },
      select: { role_id: true },
    });

    const blockedRoleIds = new Set(usersWithRoles.map((u) => u.role_id));
    const deletableRoles = candidateRoles.filter((r) => !blockedRoleIds.has(r.id));
    const deletableIds = deletableRoles.map((r) => r.id);

    if (deletableIds.length === 0) {
      throw new Error("ALL_ROLES_HAVE_ASSIGNED_USERS");
    }

    await tx.site_feature_role.deleteMany({
      where: { role_id: { in: deletableIds } },
    });

    await tx.role.deleteMany({
      where: { id: { in: deletableIds } },
    });

    return {
      affected: deletableRoles,
      blockedCount: blockedRoleIds.size,
    };
  });
}

export async function getRolesDashboardDataInDB(
  where: Prisma.roleWhereInput,
  skipCount: number,
  pageSize: number,
) {
  return await prisma.$transaction(async (tx) => {
    const roles = await tx.role.findMany({
      where,
      select: {
        id: true,
        name: true,
        is_active: true,
        created_by: true,
        updated_by: true,
        site_feature_roles: {
          select: {
            site_feature_id: true,
            access_crud: true,
            site_feature: {
              select: { id: true, name: true, path: true, enabled: true, is_super: true },
            },
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      take: pageSize,
      skip: skipCount,
      orderBy: { id: "asc" },
    });

    const siteFeatures = await tx.site_feature.findMany({
      where: { enabled: true },
      select: { id: true, name: true, path: true, enabled: true, is_super: true },
      orderBy: { name: "asc" },
    });

    const totalRoles = await tx.role.count({ where });

    const dashboardUsers = await tx.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return { roles, siteFeatures, totalRoles, dashboardUsers };
  });
}

export async function getRoleTrashDashboardDataInDB(
  where: Prisma.roleWhereInput,
  skipCount: number,
  pageSize: number,
) {
  return await prisma.$transaction(async (tx) => {
    const roles = await tx.role.findMany({
      where,
      select: {
        id: true,
        name: true,
        is_active: true,
        created_by: true,
        updated_by: true,
        deleted_at: true,
        deleted_by: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
      take: pageSize,
      skip: skipCount,
      orderBy: { deleted_at: "desc" },
    });

    const totalRoles = await tx.role.count({ where });

    const dashboardUsers = await tx.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return { roles, totalRoles, dashboardUsers };
  });
}

