"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  RoleCreateInput,
  RoleUpdateInput,
  roleCreateSchema,
  roleUpdateSchema,
  roleStatusToggleSchema,
  rolePermissionsUpdateSchema,
} from "@/lib/validations";
import {
  createRoleTransaction,
  updateRoleTransaction,
  toggleRoleStatusTransaction,
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
      message: "Please correct the errors in the form.",
    };
  }

  const { name, is_active } = validatedFields.data;

  try {
    await createRoleTransaction({ name, is_active }, Number(user.id));

    revalidateTag("roles", "max");
    revalidateTag("admin-permissions", "max");
    revalidateTag("users", "max");
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
  } catch (error: any) {
    console.error("Error creating role:", error);
    await logActivity({
      action: "create_role",
      entity_type: "role",
      user,
      status: "FAILED",
      details: { name, error: String(error) },
    });

    if (error.message === "ROLE_NAME_EXISTS") {
      return {
        success: false,
        errors: { name: "A role with this name already exists." },
        message: "A role with this name already exists.",
      };
    }
    if (error.message === "CANNOT_CREATE_SUPERADMIN") {
      return {
        success: false,
        errors: { name: "You cannot create the superadmin role." },
        message: "You cannot create the superadmin role.",
      };
    }
    return { success: false, message: "Failed to create role." };
  }
}

export async function updateRole(
  id: number,
  data: RoleUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/roles");

  if (id < 1) return { success: false, message: "Invalid role identifier." };

  const validatedFields = roleUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Please correct the errors in the form.",
    };
  }

  const { name, is_active } = validatedFields.data;

  try {
    const { targetRole } = await updateRoleTransaction(
      id,
      { name, is_active },
      Number(user.id),
    );

    revalidateTag("roles", "max");
    revalidateTag("admin-permissions", "max");
    revalidateTag(`admin-permissions-${targetRole.name}`, "max");
    if (name && name !== targetRole.name) {
      revalidateTag(`admin-permissions-${name}`, "max");
    }
    revalidateTag("users", "max");
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

    if (error.message === "ROLE_NAME_EXISTS") {
      return {
        success: false,
        errors: { name: "A role with this name already exists." },
        message: "A role with this name already exists.",
      };
    }
    if (error.message === "SUPERADMIN_NAME_IMMUTABLE") {
      return { success: false, message: "Superadmin role name cannot be changed." };
    }
    if (error.message === "SUPERADMIN_ACTIVE_IMMUTABLE") {
      return { success: false, message: "Superadmin role must remain active." };
    }
    if (error.message === "CANNOT_RENAME_TO_SUPERADMIN") {
      return {
        success: false,
        errors: { name: "You cannot rename a role to superadmin." },
        message: "You cannot rename a role to superadmin.",
      };
    }
    if (error.message === "ROLE_NOT_FOUND") {
      return { success: false, message: "Role not found." };
    }
    return { success: false, message: "Failed to update role." };
  }
}

export async function toggleRoleStatus(
  id: number,
  is_active: boolean,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/roles");

  const validatedFields = roleStatusToggleSchema.safeParse({ id, is_active });
  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid status parameters provided.",
    };
  }

  try {
    const { targetRole } = await toggleRoleStatusTransaction(
      id,
      is_active,
      Number(user.id),
    );

    revalidateTag("roles", "max");
    revalidateTag("admin-permissions", "max");
    revalidateTag(`admin-permissions-${targetRole.name}`, "max");
    revalidateTag("users", "max");
    revalidatePath("/dashboard/roles");

    await logActivity({
      action: "toggle_role_status",
      entity_type: "role",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, is_active },
    });

    return {
      success: true,
      message: `Role status updated to ${is_active ? "Active" : "Inactive"}.`,
    };
  } catch (error: any) {
    console.error("Error toggling role status:", error);
    await logActivity({
      action: "toggle_role_status",
      entity_type: "role",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });

    if (error.message === "SUPERADMIN_ACTIVE_IMMUTABLE") {
      return {
        success: false,
        message: "Superadmin role cannot be deactivated.",
      };
    }
    if (error.message === "ROLE_NOT_FOUND") {
      return { success: false, message: "Role not found." };
    }
    return { success: false, message: "Failed to update role status." };
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

  const validatedFields = rolePermissionsUpdateSchema.safeParse({
    role_id: roleId,
    permissions,
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid permissions payload provided.",
    };
  }

  try {
    const { targetRole } = await updateRolePermissionsTransaction(
      roleId,
      permissions,
    );

    revalidateTag("admin-permissions", "max");
    revalidateTag(`admin-permissions-${targetRole.name}`, "max");
    revalidateTag("roles", "max");
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

  if (id < 1) return { success: false, message: "Invalid role identifier." };

  try {
    await deleteRoleTransaction(id, Number(user.id));
    revalidateTag("roles", "max");
    revalidateTag("admin-permissions", "max");
    revalidateTag("users", "max");
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

    return { success: true, message: "Role moved to trash successfully." };
  } catch (error: any) {
    console.error("Error deleting role:", error);
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

  if (id < 1) return { success: false, message: "Invalid role identifier." };

  try {
    await restoreRoleTransaction(id, Number(user.id));
    revalidateTag("roles", "max");
    revalidateTag("admin-permissions", "max");
    revalidateTag("users", "max");
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
    console.error("Error restoring role:", error);
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

  if (id < 1) return { success: false, message: "Invalid role identifier." };

  try {
    await permanentlyDeleteRoleTransaction(id);
    revalidateTag("roles", "max");
    revalidateTag("admin-permissions", "max");
    revalidateTag("users", "max");
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
    console.error("Error permanently deleting role:", error);
    await logActivity({
      action: "permanently_delete_role",
      entity_type: "role",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    if (error.message === "ROLE_HAS_ASSIGNED_USERS") {
      return {
        success: false,
        message:
          "Cannot permanently delete this role because user accounts are assigned to it. Please reassign those users first.",
      };
    }
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
    revalidateTag("roles", "max");
    revalidateTag("admin-permissions", "max");
    revalidateTag("users", "max");
    revalidatePath("/dashboard/roles");
    revalidatePath("/dashboard/roles/trash");

    await logActivity({
      action: "bulk_delete_roles",
      entity_type: "role",
      user,
      status: "SUCCESS",
      details: { ids, selectAllScope },
    });

    return { success: true, message: "Selected roles moved to trash." };
  } catch (error) {
    console.error("Error in bulk delete roles:", error);
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
    revalidateTag("roles", "max");
    revalidateTag("admin-permissions", "max");
    revalidateTag("users", "max");
    revalidatePath("/dashboard/roles/trash");
    revalidatePath("/dashboard/roles");

    await logActivity({
      action: "bulk_restore_roles",
      entity_type: "role",
      user,
      status: "SUCCESS",
      details: { ids, selectAllScope },
    });

    return { success: true, message: "Selected roles restored." };
  } catch (error) {
    console.error("Error in bulk restore roles:", error);
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
    const result = await bulkPermanentlyDeleteRolesTransaction(
      ids,
      selectAllScope,
      filterWhere,
    );
    revalidateTag("roles", "max");
    revalidateTag("admin-permissions", "max");
    revalidateTag("users", "max");
    revalidatePath("/dashboard/roles/trash");

    await logActivity({
      action: "bulk_permanently_delete_roles",
      entity_type: "role",
      user,
      status: "SUCCESS",
      details: {
        ids,
        deletedCount: result.affected.length,
        blockedCount: result.blockedCount,
      },
    });

    if (result.blockedCount > 0) {
      return {
        success: true,
        message: `Permanently deleted ${result.affected.length} role(s). Skipped ${result.blockedCount} role(s) because user accounts are assigned to them.`,
      };
    }

    return { success: true, message: "Selected roles permanently deleted." };
  } catch (error: any) {
    console.error("Error in bulk permanent delete roles:", error);
    await logActivity({
      action: "bulk_permanently_delete_roles",
      entity_type: "role",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });

    if (error.message === "ALL_ROLES_HAVE_ASSIGNED_USERS") {
      return {
        success: false,
        message:
          "Cannot permanently delete selected roles because all selected roles have user accounts assigned to them. Please reassign those users first.",
      };
    }

    return {
      success: false,
      message: "Failed to permanently delete selected roles.",
    };
  }
}
