"use server";

import { auth } from "@/lib/auth";
import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import { getSecretFilterWhere, SecretFilterParams } from "@/lib/filters/secret-filters";
import {
  SecretVaultFormCreateInput,
  SecretVaultFormUpdateInput,
  secretVaultFormCreateSchema,
  secretVaultFormUpdateSchema,
} from "@/lib/validations";
import {
  bulkDeleteSecretsPermanentlyInDB,
  bulkUpdateSecretsInDB,
  createSecretInDB,
  deleteSecretPermanentlyInDB,
  getConnectedSecretsMap,
  updateSecretInDB,
  getSecretByIdFromDB,
  getSecretByKeyFromDB,
  getSecretTargetsFromDB,
} from "@/services/secret-services";
import { revalidatePath } from "next/cache";

/** Helper function to assert superadmin role for secret operations */
async function assertSuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "superadmin") {
    throw new Error("Unauthorized. Superadmin access required.");
  }
  return session.user;
}

// ─── CREATE SECRET ACTION ───────────────────────────────────────────────────────

export async function createSecret(
  data: SecretVaultFormCreateInput,
): Promise<ActionResponse> {
  let user: any;
  try {
    user = await assertSuperAdmin();
  } catch {
    return { success: false, message: "Unauthorized. Superadmin access required." };
  }

  const validatedFields = secretVaultFormCreateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Validation failed.",
    };
  }

  const { key_name, description } = validatedFields.data;

  try {
    const existing = await getSecretByKeyFromDB(key_name);

    if (existing) {
      return {
        success: false,
        errors: { key_name: "A secret with this key name already exists." },
        message: "Key name already exists.",
      };
    }

    await createSecretInDB({
      key_name,
      encrypted_value: "",
      iv: "",
      auth_tag: "",
      description: description || null,
      created_by: Number(user.id),
      updated_by: Number(user.id),
    });

    revalidatePath("/dashboard/secret-vault");
    return { success: true, message: "Secret key entry created successfully." };
  } catch (error) {
    console.error("Error creating secret:", error);
    return { success: false, message: "Failed to create secret key entry." };
  }
}

export async function updateSecret(
  id: number,
  data: SecretVaultFormUpdateInput,
): Promise<ActionResponse> {
  let user;
  try {
    user = await assertSuperAdmin();
  } catch {
    return { success: false, message: "Unauthorized. Superadmin access required." };
  }

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const validatedFields = secretVaultFormUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const { description } = validatedFields.data;

  try {
    await updateSecretInDB(id, {
      description: description || null,
      updated_by: Number(user.id),
    });
    revalidatePath("/dashboard/secret-vault");
    return { success: true, message: "Secret description updated successfully." };
  } catch (error) {
    console.error("Error updating secret:", error);
    return { success: false, message: "Failed to update secret." };
  }
}

export async function deleteSecret(id: number): Promise<ActionResponse> {
  let user;
  try {
    user = await assertSuperAdmin();
  } catch {
    return { success: false, message: "Unauthorized. Superadmin access required." };
  }

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const targetSecret = await getSecretByIdFromDB(id);

    if (!targetSecret) {
      return { success: false, message: "Secret not found." };
    }

    // CHECK CONNECTED SECRETS — Connected secrets CANNOT be deleted
    const connectedMap = await getConnectedSecretsMap();
    if (connectedMap[targetSecret.key_name]) {
      return {
        success: false,
        message: `Cannot delete "${targetSecret.key_name}": It is currently connected to active site configuration (${connectedMap[targetSecret.key_name]}) and cannot be deleted.`,
      };
    }

    await updateSecretInDB(id, {
      updated_by: Number(user.id),
      deleted_at: new Date(),
      deleted_by: Number(user.id),
    });

    revalidatePath("/dashboard/secret-vault");
    revalidatePath("/dashboard/secret-vault/trash");
    return { success: true, message: "Secret moved to trash successfully." };
  } catch (error) {
    console.error("Error deleting secret:", error);
    return { success: false, message: "Failed to delete secret." };
  }
}

export async function restoreSecret(id: number): Promise<ActionResponse> {
  let user;
  try {
    user = await assertSuperAdmin();
  } catch {
    return { success: false, message: "Unauthorized. Superadmin access required." };
  }

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await updateSecretInDB(id, {
      updated_by: Number(user.id),
      deleted_at: null,
      deleted_by: null,
    });

    revalidatePath("/dashboard/secret-vault/trash");
    revalidatePath("/dashboard/secret-vault");
    return { success: true, message: "Secret restored successfully." };
  } catch (error) {
    console.error("Error restoring secret:", error);
    return { success: false, message: "Failed to restore secret." };
  }
}

export async function permanentlyDeleteSecret(id: number): Promise<ActionResponse> {
  try {
    await assertSuperAdmin();
  } catch {
    return { success: false, message: "Unauthorized. Superadmin access required." };
  }

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const targetSecret = await getSecretByIdFromDB(id);

    if (!targetSecret) {
      return { success: false, message: "Secret not found." };
    }

    // CHECK CONNECTED SECRETS — Connected secrets CANNOT be deleted permanently either
    const connectedMap = await getConnectedSecretsMap();
    if (connectedMap[targetSecret.key_name]) {
      return {
        success: false,
        message: `Cannot permanently delete "${targetSecret.key_name}": It is currently connected to active site configuration (${connectedMap[targetSecret.key_name]}).`,
      };
    }

    await deleteSecretPermanentlyInDB(id);
    revalidatePath("/dashboard/secret-vault/trash");
    return { success: true, message: "Secret permanently deleted." };
  } catch (error) {
    console.error("Error permanently deleting secret:", error);
    return { success: false, message: "Failed to permanently delete secret." };
  }
}

export async function bulkDeleteSecrets(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams: SecretFilterParams = {}
): Promise<ActionResponse> {
  let user;
  try {
    user = await assertSuperAdmin();
  } catch {
    return { success: false, message: "Unauthorized. Superadmin access required." };
  }

  try {
    const filterWhere = getSecretFilterWhere(filterParams, false);
    const targets = await getSecretTargetsFromDB(ids, selectAllScope, filterWhere, false);

    const connectedMap = await getConnectedSecretsMap();
    const deletableIds = targets
      .filter((t) => !connectedMap[t.key_name])
      .map((t) => t.id);

    const connectedCount = targets.length - deletableIds.length;

    if (deletableIds.length === 0) {
      return {
        success: false,
        message: "No secrets were deleted because all selected secrets are currently connected to active system integrations.",
      };
    }

    await bulkUpdateSecretsInDB(
      deletableIds,
      {
        updated_by: Number(user.id),
        deleted_at: new Date(),
        deleted_by: Number(user.id),
      },
      false
    );

    revalidatePath("/dashboard/secret-vault");
    revalidatePath("/dashboard/secret-vault/trash");

    if (connectedCount > 0) {
      return {
        success: true,
        message: `${deletableIds.length} secrets moved to trash. ${connectedCount} connected secret(s) were skipped to prevent breaking system configurations.`,
      };
    }

    return { success: true, message: `${deletableIds.length} secrets moved to trash successfully.` };
  } catch (error) {
    console.error("Error bulk deleting secrets:", error);
    return { success: false, message: "Failed to move secrets to trash." };
  }
}

export async function bulkRestoreSecrets(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams: SecretFilterParams = {}
): Promise<ActionResponse> {
  let user;
  try {
    user = await assertSuperAdmin();
  } catch {
    return { success: false, message: "Unauthorized. Superadmin access required." };
  }

  try {
    const filterWhere = getSecretFilterWhere(filterParams, true);

    await bulkUpdateSecretsInDB(
      ids,
      {
        updated_by: Number(user.id),
        deleted_at: null,
        deleted_by: null,
      },
      selectAllScope,
      true,
      filterWhere
    );

    revalidatePath("/dashboard/secret-vault/trash");
    revalidatePath("/dashboard/secret-vault");
    return { success: true, message: "Secrets restored successfully." };
  } catch (error) {
    console.error("Error bulk restoring secrets:", error);
    return { success: false, message: "Failed to restore secrets." };
  }
}

export async function bulkPermanentlyDeleteSecrets(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams: SecretFilterParams = {}
): Promise<ActionResponse> {
  try {
    await assertSuperAdmin();
  } catch {
    return { success: false, message: "Unauthorized. Superadmin access required." };
  }

  try {
    const filterWhere = getSecretFilterWhere(filterParams, true);
    const targets = await getSecretTargetsFromDB(ids, selectAllScope, filterWhere, true);

    const connectedMap = await getConnectedSecretsMap();
    const deletableIds = targets
      .filter((t) => !connectedMap[t.key_name])
      .map((t) => t.id);

    if (deletableIds.length === 0) {
      return {
        success: false,
        message: "No secrets were deleted because all selected secrets are connected to active system integrations.",
      };
    }

    await bulkDeleteSecretsPermanentlyInDB(deletableIds, false);

    revalidatePath("/dashboard/secret-vault/trash");
    return { success: true, message: `${deletableIds.length} secrets permanently deleted.` };
  } catch (error) {
    console.error("Error bulk permanently deleting secrets:", error);
    return { success: false, message: "Failed to permanently delete secrets." };
  }
}
