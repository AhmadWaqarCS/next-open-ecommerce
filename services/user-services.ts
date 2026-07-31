import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

export async function createUserInDB(data: {
  email: string;
  password: string;
  role_name: string;
  is_active: boolean;
  name?: string | null;
  created_by: number;
  updated_by: number;
}) {
  return await prisma.dashboard_user.create({
    data: { ...data, role: { connect: { name: data.role_name } } },
  });
}

export async function getUserByIdFromDB(id: number) {
  return await prisma.dashboard_user.findUnique({
    where: { id },
  });
}

export async function updateUserInDB(
  id: number,
  data: {
    email?: string;
    password?: string;
    role_name?: string;
    is_active?: boolean;
    name?: string | null;
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
) {
  return await prisma.dashboard_user.update({
    where: { id: id },
    data: {
      ...data,
      ...(data.role_name && { role: { connect: { name: data.role_name } } }),
    },
  });
}

export async function deleteUserPermanentlyInDB(id: number) {
  return await prisma.dashboard_user.delete({
    where: {
      id: id,
      NOT: { role_name: "superadmin" },
    },
  });
}

export async function bulkUpdateUsersInDB(
  ids: number[],
  data: {
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
  selectAllScope: boolean = false,
  isTrash: boolean = false,
  filterWhere?: Prisma.dashboard_userWhereInput
) {
  let whereCondition: any;

  if (selectAllScope) {
    if (filterWhere) {
      whereCondition = {
        AND: [filterWhere, { NOT: { role_name: "superadmin" } }],
      };
    } else if (isTrash) {
      whereCondition = {
        NOT: [{ role_name: "superadmin" }, { deleted_at: null }],
      };
    } else {
      whereCondition = { deleted_at: null, NOT: { role_name: "superadmin" } };
    }
  } else {
    whereCondition = { id: { in: ids }, NOT: { role_name: "superadmin" } };
  }

  return await prisma.dashboard_user.updateMany({
    where: whereCondition,
    data,
  });
}

export async function bulkDeleteUsersPermanentlyInDB(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.dashboard_userWhereInput
) {
  let whereCondition: any;

  if (selectAllScope) {
    if (filterWhere) {
      whereCondition = {
        AND: [filterWhere, { NOT: { role_name: "superadmin" } }],
      };
    } else {
      whereCondition = {
        NOT: [{ role_name: "superadmin" }, { deleted_at: null }],
      };
    }
  } else {
    whereCondition = { id: { in: ids }, NOT: { role_name: "superadmin" } };
  }

  return await prisma.dashboard_user.deleteMany({
    where: whereCondition,
  });
}
