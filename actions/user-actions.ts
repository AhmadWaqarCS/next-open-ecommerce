"use server";

import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import { signIn } from "@/lib/auth";
import { assertPermission } from "@/lib/guards";
import {
  UserLoginInput,
  userCreateSchema,
  userLoginSchema,
  UserUpdateInput,
  userUpdateSchema,
  UserCreateInput,
} from "@/lib/validations";
import {
  createUserTransaction,
  updateUserTransaction,
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
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Invalid email or password.",
    };
  }
  redirect("/dashboard");
}

export async function updateUser(
  id: number,
  data: UserUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/users");

  if (id < 1) return { success: false, message: "An Error Occured" };

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
        email: email !== "" ? email : undefined,
        password: hashedPassword,
        role_name: role_name !== "" ? role_name : undefined,
        is_active,
        name: name !== undefined ? (name !== "" ? name : null) : undefined,
      },
      Number(user.id),
      user.role,
    );

    revalidateTag(`user-name-${id}`, "max");
    revalidatePath("/dashboard/users");
    return { success: true, message: "User updated successfully." };
  } catch (error: any) {
    console.error("Error updating user:", error);
    if (error.message === "ONLY_SUPERADMIN_CAN_MODIFY") {
      return {
        success: false,
        message: "Only the superadmin can modify superadmin details.",
      };
    }
    if (error.message === "SUPERADMIN_ROLE_IMMUTABLE") {
      return { success: false, message: "Superadmin role cannot be changed." };
    }
    if (error.message === "SUPERADMIN_ACTIVE_IMMUTABLE") {
      return {
        success: false,
        message: "Superadmin account must remain active.",
      };
    }
    if (error.message === "CANNOT_PROMOTE_TO_SUPERADMIN") {
      return {
        success: false,
        message: "You cannot promote a user to superadmin.",
      };
    }
    if (error.message === "USER_NOT_FOUND") {
      return { success: false, message: "User not found." };
    }
    return { success: false, message: "Failed to update user." };
  }
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

  if (role_name === "superadmin")
    return { success: false, message: "You cannot create superuser" };

  try {
    await createUserTransaction(
      {
        email,
        password: await bcrypt.hash(password, 10),
        role_name,
        is_active,
        name: name || null,
      },
      Number(user.id),
    );

    revalidatePath("/dashboard/users");
    return {
      success: true,
      message: "User created successfully.",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to create user.",
    };
  }
}

export async function deleteUser(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/users");

  if (id < 1) return { success: false, message: "An Error Occured" };

  if (Number(user.id) === id) {
    return { success: false, message: "You cannot delete your own account." };
  }

  try {
    await deleteUserTransaction(id, Number(user.id));
    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/users/trash");
    return {
      success: true,
      message: "User deleted successfully.",
    };
  } catch (error: any) {
    console.error(error);
    if (error.message === "CANNOT_DELETE_SUPERADMIN") {
      return { success: false, message: "Superadmin cannot be deleted." };
    }
    if (error.message === "USER_NOT_FOUND") {
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

  if (id < 1) return { success: false, message: "An Error Occured" };

  if (Number(user.id) === id) {
    return { success: false, message: "You cannot restore your own account." };
  }

  try {
    await restoreUserTransaction(id, Number(user.id));
    revalidatePath("/dashboard/users/trash");
    revalidatePath("/dashboard/users");
    return {
      success: true,
      message: "User restored successfully.",
    };
  } catch (error: any) {
    console.error(error);
    if (error.message === "CANNOT_RESTORE_SUPERADMIN") {
      return { success: false, message: "Superadmin cannot be restored." };
    }
    if (error.message === "USER_NOT_FOUND") {
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

  if (id < 1) return { success: false, message: "An Error Occured" };

  if (Number(user.id) === id) {
    return { success: false, message: "You cannot delete your own account." };
  }

  try {
    await permanentlyDeleteUserTransaction(id);
    revalidatePath("/dashboard/users/trash");
    return {
      success: true,
      message: "User permanently deleted.",
    };
  } catch (error: any) {
    console.error(error);
    if (error.message === "CANNOT_DELETE_SUPERADMIN") {
      return {
        success: false,
        message: "Superadmin cannot be deleted permanently.",
      };
    }
    if (error.message === "USER_NOT_FOUND") {
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

  try {
    await bulkDeleteUsersTransaction(
      ids,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );
    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/users/trash");
    return { success: true, message: "Selected users moved to trash." };
  } catch (error) {
    console.error(error);
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
    revalidatePath("/dashboard/users/trash");
    revalidatePath("/dashboard/users");
    return { success: true, message: "Selected users restored." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to restore selected users." };
  }
}

export async function bulkPermanentlyDeleteUsers(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: UserFilterParams,
): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/users");
  const filterWhere =
    selectAllScope && filterParams
      ? getUserFilterWhere(filterParams, true)
      : undefined;

  try {
    await bulkPermanentlyDeleteUsersTransaction(ids, selectAllScope, filterWhere);
    revalidatePath("/dashboard/users/trash");
    return { success: true, message: "Selected users permanently deleted." };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to permanently delete selected users.",
    };
  }
}
