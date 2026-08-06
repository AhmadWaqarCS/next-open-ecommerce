"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  RoleCreateInput,
  RoleUpdateInput,
  roleCreateSchema,
  roleUpdateSchema,
} from "@/lib/validations";
import {
  createRoleTransaction,
  updateRoleTransaction,
  updateRolePermissionsTransaction,
  deleteRoleTransaction,
  restoreRoleTransaction,
  permanentlyDeleteRoleTransaction,
  bulkDeleteRolesTransaction,
  bulkRestoreRolesTransaction,
  bulkPermanentlyDeleteRolesTransaction,
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
    await createRoleTransaction({ name, is_active }, Number(user.id));
    revalidatePath("/dashboard/roles");

    await logActivity({
      action: "create_role",
      entity_type: "role",
      entity_id: name,
      user,
      status: "SUCCESS",
      details: { name },
    });

    return { success: true, message: "Role created successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "create_role",
      entity_type: "role",
      user,
      status: "FAILED",
      details: { name, error: String(error) },
    });
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

  try {
    const { targetRole } = await updateRoleTransaction(
      id,
      { name, is_active },
      Number(user.id),
    );

    revalidateTag("admin-permissions", "max");
    revalidateTag(`admin-permissions-${targetRole.name}`, "max");
    revalidatePath("/dashboard/roles");

    await logActivity({
      action: "update_role",
      entity_type: "role",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, name },
    });

    return { success: true, message: "Role updated successfully." };
  } catch (error: any) {
    console.error("Error updating role:", error);
    await logActivity({
      action: "update_role",
      entity_type: "role",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    if (error.message === "SUPERADMIN_NAME_IMMUTABLE") {
      return { success: false, message: "Superadmin role name cannot be changed." };
    }
    if (error.message === "SUPERADMIN_ACTIVE_IMMUTABLE") {
      return { success: false, message: "Superadmin role must remain active." };
    }
    if (error.message === "CANNOT_RENAME_TO_SUPERADMIN") {
      return { success: false, message: "You cannot rename a role to superadmin." };
    }
    if (error.message === "ROLE_NOT_FOUND") {
      return { success: false, message: "Role not found." };
    }
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
  const { user } = await assertPermission("update", "/dashboard/roles");

  if (roleId < 1) return { success: false, message: "An Error Occurred" };
  if (!permissions.length)
    return { success: false, message: "No permissions provided." };

  try {
    const { targetRole } = await updateRolePermissionsTransaction(
      roleId,
      permissions,
    );

    revalidateTag("admin-permissions", "max");
    revalidateTag(`admin-permissions-${targetRole.name}`, "max");
    revalidatePath("/dashboard/roles");

    await logActivity({
      action: "update_role_permissions",
      entity_type: "role",
      entity_id: roleId,
      user,
      status: "SUCCESS",
      details: { roleId, permissionsCount: permissions.length },
    });

    return { success: true, message: "Permissions updated successfully." };
  } catch (error: any) {
    console.error("Error updating role permissions:", error);
    await logActivity({
      action: "update_role_permissions",
      entity_type: "role",
      entity_id: roleId,
      user,
      status: "FAILED",
      details: { roleId, error: String(error) },
    });
    if (error.message === "SUPERADMIN_PERMISSIONS_IMMUTABLE") {
      return { success: false, message: "Superadmin role permissions are immutable." };
    }
    if (error.message === "ROLE_NOT_FOUND") {
      return { success: false, message: "Role not found." };
    }
    return { success: false, message: "Failed to update permissions." };
  }
}

export async function deleteRole(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/roles");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await deleteRoleTransaction(id, Number(user.id));
    revalidatePath("/dashboard/roles");
    revalidatePath("/dashboard/roles/trash");

    await logActivity({
      action: "delete_role",
      entity_type: "role",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return { success: true, message: "Role deleted successfully." };
  } catch (error: any) {
    console.error(error);
    await logActivity({
      action: "delete_role",
      entity_type: "role",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    if (error.message === "CANNOT_DELETE_SUPERADMIN") {
      return { success: false, message: "Superadmin role cannot be deleted." };
    }
    if (error.message === "ROLE_NOT_FOUND") {
      return { success: false, message: "Role not found." };
    }
    return { success: false, message: "Failed to delete role." };
  }
}

export async function restoreRole(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/roles");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await restoreRoleTransaction(id, Number(user.id));
    revalidatePath("/dashboard/roles/trash");
    revalidatePath("/dashboard/roles");

    await logActivity({
      action: "restore_role",
      entity_type: "role",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return { success: true, message: "Role restored successfully." };
  } catch (error: any) {
    console.error(error);
    await logActivity({
      action: "restore_role",
      entity_type: "role",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    if (error.message === "ROLE_NOT_FOUND") {
      return { success: false, message: "Role not found." };
    }
    return { success: false, message: "Failed to restore role." };
  }
}

export async function permanentlyDeleteRole(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/roles");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await permanentlyDeleteRoleTransaction(id);
    revalidatePath("/dashboard/roles/trash");

    await logActivity({
      action: "permanently_delete_role",
      entity_type: "role",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return { success: true, message: "Role permanently deleted." };
  } catch (error: any) {
    console.error(error);
    await logActivity({
      action: "permanently_delete_role",
      entity_type: "role",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    if (error.message === "CANNOT_DELETE_SUPERADMIN") {
      return {
        success: false,
        message: "Superadmin role cannot be deleted permanently.",
      };
    }
    if (error.message === "ROLE_NOT_FOUND") {
      return { success: false, message: "Role not found." };
    }
    return { success: false, message: "Failed to permanently delete role." };
  }
}

export async function bulkDeleteRoles(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: RoleFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/roles");
  const filterWhere =
    selectAllScope && filterParams
      ? await getRoleFilterWhere(filterParams, false)
      : undefined;

  try {
    await bulkDeleteRolesTransaction(
      ids,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );
    revalidatePath("/dashboard/roles");
    revalidatePath("/dashboard/roles/trash");

    await logActivity({
      action: "bulk_delete_roles",
      entity_type: "role",
      user,
      status: "SUCCESS",
      details: { ids },
    });

    return { success: true, message: "Selected roles moved to trash." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "bulk_delete_roles",
      entity_type: "role",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return { success: false, message: "Failed to delete selected roles." };
  }
}

export async function bulkRestoreRoles(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: RoleFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/roles");
  const filterWhere =
    selectAllScope && filterParams
      ? await getRoleFilterWhere(filterParams, true)
      : undefined;

  try {
    await bulkRestoreRolesTransaction(
      ids,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );
    revalidatePath("/dashboard/roles/trash");
    revalidatePath("/dashboard/roles");

    await logActivity({
      action: "bulk_restore_roles",
      entity_type: "role",
      user,
      status: "SUCCESS",
      details: { ids },
    });

    return { success: true, message: "Selected roles restored." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "bulk_restore_roles",
      entity_type: "role",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return { success: false, message: "Failed to restore selected roles." };
  }
}

export async function bulkPermanentlyDeleteRoles(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: RoleFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/roles");
  const filterWhere =
    selectAllScope && filterParams
      ? await getRoleFilterWhere(filterParams, true)
      : undefined;

  try {
    await bulkPermanentlyDeleteRolesTransaction(ids, selectAllScope, filterWhere);
    revalidatePath("/dashboard/roles/trash");

    await logActivity({
      action: "bulk_permanently_delete_roles",
      entity_type: "role",
      user,
      status: "SUCCESS",
      details: { ids },
    });

    return { success: true, message: "Selected roles permanently deleted." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "bulk_permanently_delete_roles",
      entity_type: "role",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return {
      success: false,
      message: "Failed to permanently delete selected roles.",
    };
  }
}
