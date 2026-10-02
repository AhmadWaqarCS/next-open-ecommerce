"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { signIn } from "@/lib/auth";
import { assertPermission } from "@/lib/guards";
import {
  UserLoginInput,
  userCreateSchema,
  userLoginSchema,
  UserUpdateInput,
  userUpdateSchema,
  UserCreateInput,
  userStatusToggleSchema,
} from "@/lib/validations";
import {
  createUserTransaction,
  updateUserTransaction,
  toggleUserStatusTransaction,
  deleteUserTransaction,
  restoreUserTransaction,
  permanentlyDeleteUserTransaction,
  bulkDeleteUsersTransaction,
  bulkRestoreUsersTransaction,
  bulkPermanentlyDeleteUsersTransaction,
} from "@/services/user-services";
import bcrypt from "bcryptjs";
import { UserFilterParams, getUserFilterWhere } from "@/lib/filters/user-filters";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

export async function dashboardLogin(
  data: UserLoginInput,
): Promise<ActionResponse> {
  const validatedFields = userLoginSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Credentials",
    };
  }

  const { email, password } = validatedFields.data;

  try {
    await signIn("credentials", {
      email: email,
      password: password,
      redirect: false,
    });
    await logActivity({
      action: "dashboard_login",
      entity_type: "user",
      user: { email },
      status: "SUCCESS",
      details: { email },
    });
  } catch (error) {
    console.error("Dashboard login failed:", error);
    await logActivity({
      action: "dashboard_login",
      entity_type: "user",
      user: { email },
      status: "FAILED",
      details: { email, error: String(error) },
    });
    return {
      success: false,
      message: "Invalid email or password.",
    };
  }
  redirect("/dashboard");
}

export async function createUser(
  data: UserCreateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/users");
  const validatedFields = userCreateSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const { email, password, role_name, is_active, name } = validatedFields.data;

  if (role_name.toLowerCase() === "superadmin") {
    return {
      success: false,
      errors: { role_name: "Cannot create a user with the superadmin role." },
      message: "You cannot create superuser",
    };
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await createUserTransaction(
      {
        email,
        password: hashedPassword,
        role_name,
        is_active,
        name: name || null,
      },
      Number(user.id),
    );

    revalidateTag("users", "max");
    revalidatePath("/dashboard/users");

    await logActivity({
      action: "create_user",
      entity_type: "user",
      entity_id: email,
      user,
      status: "SUCCESS",
      details: { email, role_name },
    });

    return {
      success: true,
      message: "User created successfully.",
    };
  } catch (error: any) {
    console.error("Error creating user:", error);
    await logActivity({
      action: "create_user",
      entity_type: "user",
      user,
      status: "FAILED",
      details: { email, role_name, error: String(error) },
    });

    if (error?.message === "EMAIL_ALREADY_EXISTS" || error?.code === "P2002") {
      return {
        success: false,
        errors: { email: "A user with this email address already exists." },
        message: "Email is already in use.",
      };
    }
    if (error?.message === "ROLE_NOT_FOUND") {
      return {
        success: false,
        errors: { role_name: "Selected role does not exist." },
        message: "Invalid role selected.",
      };
    }

    return {
      success: false,
      message: "Failed to create user.",
    };
  }
}

export async function updateUser(
  id: number,
  data: UserUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/users");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const validatedFields = userUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const { email, password, role_name, is_active, name } = validatedFields.data;

  try {
    const hashedPassword =
      password && password !== "" ? await bcrypt.hash(password, 10) : undefined;

    await updateUserTransaction(
      id,
      {
        email: email && email !== "" ? email : undefined,
        password: hashedPassword,
        role_name: role_name && role_name !== "" ? role_name : undefined,
        is_active,
        name: name !== undefined ? (name !== "" ? name : null) : undefined,
      },
      Number(user.id),
      user.role,
    );

    revalidateTag("users", "max");
    revalidateTag(`user-name-${id}`, "max");
    revalidatePath("/dashboard/users");

    await logActivity({
      action: "update_user",
      entity_type: "user",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, email, role_name },
    });

    return { success: true, message: "User updated successfully." };
  } catch (error: any) {
    console.error("Error updating user:", error);
    await logActivity({
      action: "update_user",
      entity_type: "user",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });

    if (error?.message === "EMAIL_ALREADY_EXISTS" || error?.code === "P2002") {
      return {
        success: false,
        errors: { email: "This email address is already in use by another user." },
        message: "Email is already in use.",
      };
    }
    if (error?.message === "ONLY_SUPERADMIN_CAN_MODIFY") {
      return {
        success: false,
        message: "Only the superadmin can modify superadmin details.",
      };
    }
    if (error?.message === "SUPERADMIN_ROLE_IMMUTABLE") {
      return { success: false, message: "Superadmin role cannot be changed." };
    }
    if (error?.message === "SUPERADMIN_ACTIVE_IMMUTABLE") {
      return {
        success: false,
        message: "Superadmin account must remain active.",
      };
    }
    if (error?.message === "CANNOT_PROMOTE_TO_SUPERADMIN") {
      return {
        success: false,
        message: "You cannot promote a user to superadmin.",
      };
    }
    if (error?.message === "USER_NOT_FOUND") {
      return { success: false, message: "User not found." };
    }

    return { success: false, message: "Failed to update user." };
  }
}

export async function toggleUserStatus(
  id: number,
  is_active: boolean,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/users");

  const validated = userStatusToggleSchema.safeParse({ id, is_active });
  if (!validated.success) {
    return { success: false, message: "Invalid user or status." };
  }

  try {
    await toggleUserStatusTransaction(id, is_active, Number(user.id));

    revalidateTag("users", "max");
    revalidatePath("/dashboard/users");

    await logActivity({
      action: "toggle_user_status",
      entity_type: "user",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, is_active },
    });

    return {
      success: true,
      message: `User ${is_active ? "activated" : "deactivated"} successfully.`,
    };
  } catch (error: any) {
    console.error("Error toggling user status:", error);
    await logActivity({
      action: "toggle_user_status",
      entity_type: "user",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, is_active, error: String(error) },
    });

    if (error?.message === "SUPERADMIN_ACTIVE_IMMUTABLE") {
      return {
        success: false,
        message: "Superadmin account must remain active.",
      };
    }
    if (error?.message === "USER_NOT_FOUND") {
      return { success: false, message: "User not found." };
    }

    return { success: false, message: "Failed to change user status." };
  }
}

export async function deleteUser(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/users");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  if (Number(user.id) === id) {
    return { success: false, message: "You cannot delete your own account." };
  }

  try {
    await deleteUserTransaction(id, Number(user.id));

    revalidateTag("users", "max");
    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/users/trash");

    await logActivity({
      action: "delete_user",
      entity_type: "user",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return {
      success: true,
      message: "User moved to trash successfully.",
    };
  } catch (error: any) {
    console.error("Error deleting user:", error);
    await logActivity({
      action: "delete_user",
      entity_type: "user",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });

    if (error?.message === "CANNOT_DELETE_SUPERADMIN") {
      return { success: false, message: "Superadmin cannot be deleted." };
    }
    if (error?.message === "USER_NOT_FOUND") {
      return { success: false, message: "User not found." };
    }

    return {
      success: false,
      message: "Failed to delete user.",
    };
  }
}

export async function restoreUser(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/users");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  if (Number(user.id) === id) {
    return { success: false, message: "You cannot restore your own account." };
  }

  try {
    await restoreUserTransaction(id, Number(user.id));

    revalidateTag("users", "max");
    revalidatePath("/dashboard/users/trash");
    revalidatePath("/dashboard/users");

    await logActivity({
      action: "restore_user",
      entity_type: "user",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return {
      success: true,
      message: "User restored successfully.",
    };
  } catch (error: any) {
    console.error("Error restoring user:", error);
    await logActivity({
      action: "restore_user",
      entity_type: "user",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });

    if (error?.message === "CANNOT_RESTORE_SUPERADMIN") {
      return { success: false, message: "Superadmin cannot be restored." };
    }
    if (error?.message === "USER_NOT_FOUND") {
      return { success: false, message: "User not found." };
    }

    return {
      success: false,
      message: "Failed to restore user.",
    };
  }
}

export async function permanentlyDeleteUser(
  id: number,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/users");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  if (Number(user.id) === id) {
    return { success: false, message: "You cannot delete your own account." };
  }

  try {
    await permanentlyDeleteUserTransaction(id);

    revalidateTag("users", "max");
    revalidatePath("/dashboard/users/trash");

    await logActivity({
      action: "permanently_delete_user",
      entity_type: "user",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return {
      success: true,
      message: "User permanently deleted.",
    };
  } catch (error: any) {
    console.error("Error permanently deleting user:", error);
    await logActivity({
      action: "permanently_delete_user",
      entity_type: "user",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });

    if (error?.message === "CANNOT_DELETE_SUPERADMIN") {
      return {
        success: false,
        message: "Superadmin cannot be deleted permanently.",
      };
    }
    if (error?.message === "USER_NOT_FOUND") {
      return { success: false, message: "User not found." };
    }

    return {
      success: false,
      message: "Failed to delete user permanently.",
    };
  }
}

export async function bulkDeleteUsers(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: UserFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/users");
  const filterWhere =
    selectAllScope && filterParams
      ? getUserFilterWhere(filterParams, false)
      : undefined;

  const currentUserId = Number(user.id);
  const safeIds = ids.filter((id) => id !== currentUserId);

  try {
    await bulkDeleteUsersTransaction(
      safeIds,
      selectAllScope,
      filterWhere,
      currentUserId,
    );

    revalidateTag("users", "max");
    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/users/trash");

    await logActivity({
      action: "bulk_delete_users",
      entity_type: "user",
      user,
      status: "SUCCESS",
      details: { ids: safeIds, selectAllScope },
    });

    return { success: true, message: "Selected users moved to trash." };
  } catch (error) {
    console.error("Error bulk deleting users:", error);
    await logActivity({
      action: "bulk_delete_users",
      entity_type: "user",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return { success: false, message: "Failed to delete selected users." };
  }
}

export async function bulkRestoreUsers(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: UserFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/users");
  const filterWhere =
    selectAllScope && filterParams
      ? getUserFilterWhere(filterParams, true)
      : undefined;

  try {
    await bulkRestoreUsersTransaction(
      ids,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );

    revalidateTag("users", "max");
    revalidatePath("/dashboard/users/trash");
    revalidatePath("/dashboard/users");

    await logActivity({
      action: "bulk_restore_users",
      entity_type: "user",
      user,
      status: "SUCCESS",
      details: { ids, selectAllScope },
    });

    return { success: true, message: "Selected users restored." };
  } catch (error) {
    console.error("Error bulk restoring users:", error);
    await logActivity({
      action: "bulk_restore_users",
      entity_type: "user",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return { success: false, message: "Failed to restore selected users." };
  }
}

export async function bulkPermanentlyDeleteUsers(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: UserFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/users");
  const filterWhere =
    selectAllScope && filterParams
      ? getUserFilterWhere(filterParams, true)
      : undefined;

  const currentUserId = Number(user.id);
  const safeIds = ids.filter((id) => id !== currentUserId);

  try {
    await bulkPermanentlyDeleteUsersTransaction(
      safeIds,
      selectAllScope,
      filterWhere,
      currentUserId,
    );

    revalidateTag("users", "max");
    revalidatePath("/dashboard/users/trash");

    await logActivity({
      action: "bulk_permanently_delete_users",
      entity_type: "user",
      user,
      status: "SUCCESS",
      details: { ids: safeIds, selectAllScope },
    });

    return { success: true, message: "Selected users permanently deleted." };
  } catch (error) {
    console.error("Error bulk permanently deleting users:", error);
    await logActivity({
      action: "bulk_permanently_delete_users",
      entity_type: "user",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return {
      success: false,
      message: "Failed to permanently delete selected users.",
    };
  }
}
