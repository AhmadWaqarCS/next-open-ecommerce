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
  bulkDeleteUsersPermanentlyInDB,
  bulkUpdateUsersInDB,
  createUserInDB,
  deleteUserPermanentlyInDB,
  updateUserInDB,
  getUserByIdFromDB,
} from "@/services/user-services";
import bcrypt from "bcryptjs";
import { UserFilterParams, getUserFilterWhere } from "@/lib/filters/user-filters";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

export async function dashboardLogin(
  data: UserLoginInput,
): Promise<ActionResponse> {
  // Safely parse data against the schema
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

  // Load target user from DB to verify constraints
  const targetUser = await getUserByIdFromDB(id);

  if (!targetUser) {
    return { success: false, message: "User not found." };
  }

  const isSuperadmin = targetUser.role_name === "superadmin";

  if (isSuperadmin) {
    // Only the superadmin can modify superadmin details
    if (user.role !== "superadmin") {
      return {
        success: false,
        message: "Only the superadmin can modify superadmin details.",
      };
    }
    // Superadmin role cannot be changed
    if (role_name && role_name !== "superadmin") {
      return { success: false, message: "Superadmin role cannot be changed." };
    }
    // Superadmin account cannot become inactive
    if (is_active === false) {
      return {
        success: false,
        message: "Superadmin account must remain active.",
      };
    }
  } else {
    // No other role can be promoted to a superadmin
    if (role_name === "superadmin") {
      return {
        success: false,
        message: "You cannot promote a user to superadmin.",
      };
    }
  }

  try {
    await updateUserInDB(id, {
      email: email !== "" ? email : undefined,
      password:
        password && password !== ""
          ? await bcrypt.hash(password, 10)
          : undefined,
      role_name: isSuperadmin
        ? "superadmin"
        : role_name !== ""
          ? role_name
          : undefined,
      is_active: isSuperadmin ? true : is_active,
      name: name !== undefined ? (name !== "" ? name : null) : undefined,
      updated_by: Number(user.id),
    });
    revalidateTag(`user-name-${id}`, "max");
    revalidatePath("/dashboard/users");
    return { success: true, message: "User updated successfully." };
  } catch (error) {
    console.log(error);
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
    await createUserInDB({
      email: email,
      password: await bcrypt.hash(password, 10),
      role_name: role_name,
      is_active: is_active,
      name: name || null,
      created_by: Number(user.id),
      updated_by: Number(user.id),
    });
    revalidatePath("/dashboard/users");
    return {
      success: true,
      message: "User created successfully.",
    };
  } catch (error) {
    console.log(error);
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

  const targetUser = await getUserByIdFromDB(id);

  if (!targetUser) {
    return { success: false, message: "User not found." };
  }

  if (targetUser.role_name === "superadmin") {
    return { success: false, message: "Superadmin cannot be deleted." };
  }

  try {
    await updateUserInDB(id, {
      updated_by: Number(user.id),
      deleted_at: new Date(),
      deleted_by: Number(user.id),
    });
    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/users/trash");
    return {
      success: true,
      message: "User deleted successfully.",
    };
  } catch (error) {
    console.log(error);
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

  const targetUser = await getUserByIdFromDB(id);

  if (!targetUser) {
    return { success: false, message: "User not found." };
  }

  if (targetUser.role_name === "superadmin") {
    return { success: false, message: "Superadmin cannot be restored." };
  }

  try {
    await updateUserInDB(id, {
      updated_by: Number(user.id),
      deleted_at: null,
      deleted_by: null,
    });
    revalidatePath("/dashboard/users/trash");
    revalidatePath("/dashboard/users");
    return {
      success: true,
      message: "User restored successfully.",
    };
  } catch (error) {
    console.log(error);
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

  const targetUser = await getUserByIdFromDB(id);

  if (!targetUser) {
    return { success: false, message: "User not found." };
  }

  if (targetUser.role_name === "superadmin") {
    return {
      success: false,
      message: "Superadmin cannot be deleted permanently.",
    };
  }

  try {
    await deleteUserPermanentlyInDB(id);
    revalidatePath("/dashboard/users/trash");
    return {
      success: true,
      message: "User permanently deleted.",
    };
  } catch (error) {
    console.log(error);
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
  const filterWhere = selectAllScope && filterParams ? getUserFilterWhere(filterParams, false) : undefined;

  try {
    await bulkUpdateUsersInDB(
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
  const filterWhere = selectAllScope && filterParams ? getUserFilterWhere(filterParams, true) : undefined;

  try {
    await bulkUpdateUsersInDB(
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
  const filterWhere = selectAllScope && filterParams ? getUserFilterWhere(filterParams, true) : undefined;

  try {
    await bulkDeleteUsersPermanentlyInDB(ids, selectAllScope, filterWhere);
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

