"use server";

import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  RoleCreateInput,
  RoleUpdateInput,
  roleCreateSchema,
  roleUpdateSchema,
} from "@/lib/validations";
import {
  bulkDeleteRolesPermanentlyInDB,
  bulkUpdateRolesInDB,
  createRoleInDB,
  deleteRolePermanentlyInDB,
  updateRoleInDB,
  updateRolePermissionsInDB,
  getRoleByIdFromDB,
} from "@/services/role-services";
import { revalidatePath, revalidateTag } from "next/cache";
import { RoleFilterParams, getRoleFilterWhere } from "@/lib/filters/role-filters";

export async function createRole(
  data: RoleCreateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/roles");

  const validatedFields = roleCreateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const { name, is_active } = validatedFields.data;

  if (name === "superadmin")
    return { success: false, message: "You cannot create the superadmin role." };

  try {
    await createRoleInDB({
      name,
      created_by: Number(user.id),
      updated_by: Number(user.id),
    });
    revalidatePath("/dashboard/roles");
    return { success: true, message: "Role created successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to create role." };
  }
}

export async function updateRole(
  id: number,
  data: RoleUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/roles");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const validatedFields = roleUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const { name, is_active } = validatedFields.data;

  const targetRole = await getRoleByIdFromDB(id);

  if (!targetRole) {
    return { success: false, message: "Role not found." };
  }

  if (targetRole.name === "superadmin") {
    if (name && name !== "superadmin") {
      return { success: false, message: "Superadmin role name cannot be changed." };
    }
    if (is_active === false) {
      return { success: false, message: "Superadmin role must remain active." };
    }
  } else {
    if (name === "superadmin") {
      return { success: false, message: "You cannot rename a role to superadmin." };
    }
  }

  try {
    await updateRoleInDB(id, {
      name: targetRole.name === "superadmin" ? "superadmin" : name,
      is_active: targetRole.name === "superadmin" ? true : is_active,
      updated_by: Number(user.id),
    });
    revalidateTag("admin-permissions", "max");
    revalidateTag(`admin-permissions-${targetRole.name}`, "max");
    revalidatePath("/dashboard/roles");
    return { success: true, message: "Role updated successfully." };
  } catch (error) {
    console.error("Error updating role:", error);
    return { success: false, message: "Failed to update role." };
  }
}

export async function updateRolePermissions(
  roleId: number,
  permissions: {
    site_feature_id: number;
    access_crud: { create: boolean; read: boolean; update: boolean; delete: boolean };
  }[],
): Promise<ActionResponse> {
  await assertPermission("update", "/dashboard/roles");

  if (roleId < 1) return { success: false, message: "An Error Occurred" };
  if (!permissions.length)
    return { success: false, message: "No permissions provided." };

  const targetRole = await getRoleByIdFromDB(roleId);

  if (!targetRole) {
    return { success: false, message: "Role not found." };
  }

  if (targetRole.name === "superadmin") {
    return { success: false, message: "Superadmin role permissions are immutable." };
  }

  try {
    await updateRolePermissionsInDB(roleId, permissions);
    revalidateTag("admin-permissions", "max");
    revalidateTag(`admin-permissions-${targetRole.name}`, "max");
    revalidatePath("/dashboard/roles");
    return { success: true, message: "Permissions updated successfully." };
  } catch (error) {
    console.error("Error updating role permissions:", error);
    return { success: false, message: "Failed to update permissions." };
  }
}

export async function deleteRole(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/roles");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const targetRole = await getRoleByIdFromDB(id);

  if (!targetRole) {
    return { success: false, message: "Role not found." };
  }

  if (targetRole.name === "superadmin") {
    return { success: false, message: "Superadmin role cannot be deleted." };
  }

  try {
    await updateRoleInDB(id, {
      updated_by: Number(user.id),
      deleted_at: new Date(),
      deleted_by: Number(user.id),
    });
    revalidatePath("/dashboard/roles");
    revalidatePath("/dashboard/roles/trash");
    return { success: true, message: "Role deleted successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to delete role." };
  }
}

export async function restoreRole(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/roles");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const targetRole = await getRoleByIdFromDB(id);

  if (!targetRole) {
    return { success: false, message: "Role not found." };
  }

  if (targetRole.name === "superadmin") {
    return { success: false, message: "Superadmin role cannot be restored." };
  }

  try {
    await updateRoleInDB(id, {
      updated_by: Number(user.id),
      deleted_at: null,
      deleted_by: null,
    });
    revalidatePath("/dashboard/roles/trash");
    revalidatePath("/dashboard/roles");
    return { success: true, message: "Role restored successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to restore role." };
  }
}

export async function permanentlyDeleteRole(id: number): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/roles");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const targetRole = await getRoleByIdFromDB(id);

  if (!targetRole) {
    return { success: false, message: "Role not found." };
  }

  if (targetRole.name === "superadmin") {
    return { success: false, message: "Superadmin role cannot be deleted permanently." };
  }

  try {
    await deleteRolePermanentlyInDB(id);
    revalidatePath("/dashboard/roles/trash");
    return { success: true, message: "Role permanently deleted." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to permanently delete role." };
  }
}

export async function bulkDeleteRoles(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: RoleFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/roles");
  const filterWhere = selectAllScope && filterParams ? await getRoleFilterWhere(filterParams, false) : undefined;

  try {
    await bulkUpdateRolesInDB(
      ids,
      {
        updated_by: Number(user.id),
        deleted_at: new Date(),
        deleted_by: Number(user.id),
      },
      selectAllScope,
      false,
      filterWhere,
    );
    revalidatePath("/dashboard/roles");
    revalidatePath("/dashboard/roles/trash");
    return { success: true, message: "Selected roles moved to trash." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to delete selected roles." };
  }
}

export async function bulkRestoreRoles(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: RoleFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/roles");
  const filterWhere = selectAllScope && filterParams ? await getRoleFilterWhere(filterParams, true) : undefined;

  try {
    await bulkUpdateRolesInDB(
      ids,
      {
        updated_by: Number(user.id),
        deleted_at: null,
        deleted_by: null,
      },
      selectAllScope,
      true,
      filterWhere,
    );
    revalidatePath("/dashboard/roles/trash");
    revalidatePath("/dashboard/roles");
    return { success: true, message: "Selected roles restored." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to restore selected roles." };
  }
}

export async function bulkPermanentlyDeleteRoles(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: RoleFilterParams,
): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/roles");
  const filterWhere = selectAllScope && filterParams ? await getRoleFilterWhere(filterParams, true) : undefined;

  try {
    await bulkDeleteRolesPermanentlyInDB(ids, selectAllScope, filterWhere);
    revalidatePath("/dashboard/roles/trash");
    return { success: true, message: "Selected roles permanently deleted." };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to permanently delete selected roles.",
    };
  }
}

