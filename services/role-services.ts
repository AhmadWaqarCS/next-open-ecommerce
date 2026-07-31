import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

export async function createRoleInDB(data: {
  name: string;
  created_by: number;
  updated_by: number;
}) {
  const features = await prisma.site_feature.findMany({ select: { id: true } });
  const result = await prisma.role.create({
    data: {
      ...data,
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
  return result;
}

export async function getRolesFromDB() {
  return await prisma.role.findMany({
    where: { deleted_at: null },
    select: {
      id: true,
      name: true,
      is_active: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getDeletedRolesFromDB() {
  return await prisma.role.findMany({
    where: { deleted_at: { not: null } },
    select: {
      id: true,
      name: true,
      is_active: true,
      deleted_at: true,
      deleted_by: true,
    },
    orderBy: { deleted_at: "desc" },
  });
}

export async function getRoleByIdFromDB(id: number) {
  return await prisma.role.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      is_active: true,
      site_feature_roles: {
        select: {
          site_feature_id: true,
          access_crud: true,
          site_feature: {
            select: {
              id: true,
              name: true,
              path: true,
              enabled: true,
              is_super: true,
            },
          },
        },
      },
      created_at: true,
      created_by: true,
      updated_at: true,
      updated_by: true,
      deleted_at: true,
      deleted_by: true,
    },
  });
}

export async function getSiteFeaturesFromDB() {
  return await prisma.site_feature.findMany({ orderBy: { name: "asc" } });
}

export async function updateRoleInDB(
  id: number,
  data: {
    name?: string;
    is_active?: boolean;
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
) {
  return await prisma.role.update({ where: { id }, data });
}

export async function updateRolePermissionsInDB(
  role_id: number,
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
  return await prisma.$transaction(
    permissions.map((p) =>
      prisma.site_feature_role.upsert({
        where: {
          site_feature_id_role_id: {
            site_feature_id: p.site_feature_id,
            role_id,
          },
        },
        update: { access_crud: p.access_crud },
        create: {
          site_feature_id: p.site_feature_id,
          role_id,
          access_crud: p.access_crud,
        },
      }),
    ),
  );
}

export async function deleteRolePermanentlyInDB(id: number) {
  return await prisma.role.delete({ where: { id } });
}

export async function bulkUpdateRolesInDB(
  ids: number[],
  data: {
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
  selectAllScope: boolean = false,
  isTrash: boolean = false,
  filterWhere?: Prisma.roleWhereInput
) {
  let whereCondition: any;

  if (selectAllScope) {
    if (filterWhere) {
      whereCondition = {
        AND: [filterWhere, { NOT: { name: "superadmin" } }],
      };
    } else if (isTrash) {
      whereCondition = { NOT: [{ name: "superadmin" }, { deleted_at: null }] };
    } else {
      whereCondition = { deleted_at: null, NOT: { name: "superadmin" } };
    }
  } else {
    whereCondition = { id: { in: ids }, NOT: { name: "superadmin" } };
  }

  return await prisma.role.updateMany({
    where: whereCondition,
    data,
  });
}

export async function bulkDeleteRolesPermanentlyInDB(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.roleWhereInput
) {
  let whereCondition: any;

  if (selectAllScope) {
    if (filterWhere) {
      whereCondition = {
        AND: [filterWhere, { NOT: { name: "superadmin" } }],
      };
    } else {
      whereCondition = { NOT: [{ name: "superadmin" }, { deleted_at: null }] };
    }
  } else {
    whereCondition = { id: { in: ids }, NOT: { name: "superadmin" } };
  }

  return await prisma.role.deleteMany({
    where: whereCondition,
  });
}
