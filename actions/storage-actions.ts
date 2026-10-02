"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { assertPermission } from "@/lib/guards";
import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { storageKeySchema, storageMigrationSchema } from "@/lib/validations";
import {
  verifyStorageOptionService,
  activateStorageOptionInDB,
} from "@/services/storage-services";
import { migrateStorageFiles, MigrationResult } from "@/services/storage-migration-services";
import { StorageEnvCheckResult } from "@/lib/storage/flydrive";

/**
 * Server action to verify environment variables and ping connectivity for a storage option.
 */
export async function verifyStorageEnvAction(
  storageKey: string,
): Promise<ActionResponse<StorageEnvCheckResult>> {
  const { user } = await assertPermission("read", "/dashboard/storages");

  const parsed = storageKeySchema.safeParse({ storageKey });
  if (!parsed.success) {
    return {
      success: false,
      errors: formatZodErrors(parsed.error),
      message: "Invalid storage key provided.",
    };
  }

  try {
    const check = await verifyStorageOptionService(parsed.data.storageKey);

    await logActivity({
      action: "verify_storage_env",
      entity_type: "storage_option",
      entity_id: parsed.data.storageKey,
      user,
      status: check.valid ? "SUCCESS" : "FAILED",
      details: { storage_key: parsed.data.storageKey, valid: check.valid, error: check.error },
    });

    if (!check.valid) {
      return {
        success: false,
        message: check.error || "Storage environment configuration or connection check failed.",
        data: check,
      };
    }

    return {
      success: true,
      message: `Environment configuration and live connection verified for '${parsed.data.storageKey}'.`,
      data: check,
    };
  } catch (error: any) {
    console.error(`[verifyStorageEnvAction] Error verifying '${storageKey}':`, error);
    return {
      success: false,
      message: error?.message || "Storage verification test encountered an unexpected error.",
    };
  }
}

/**
 * Server action to activate a storage option as the primary write target.
 */
export async function activateStorageAction(
  storageKey: string,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/storages");

  const parsed = storageKeySchema.safeParse({ storageKey });
  if (!parsed.success) {
    return {
      success: false,
      errors: formatZodErrors(parsed.error),
      message: "Invalid storage key.",
    };
  }

  try {
    const updated = await activateStorageOptionInDB(parsed.data.storageKey, Number(user.id || 1));

    revalidatePath("/dashboard/storages");
    revalidatePath("/dashboard/media");
    revalidateTag("storage-options", "max");
    revalidateTag("active-storage", "max");

    await logActivity({
      action: "activate_storage_option",
      entity_type: "storage_option",
      entity_id: updated.key,
      user,
      status: "SUCCESS",
      details: { storage_key: updated.key, name: updated.name },
    });

    return {
      success: true,
      message: `'${updated.name}' activated as the primary active storage target.`,
    };
  } catch (error: any) {
    console.error(`[activateStorageAction] Error activating '${storageKey}':`, error);
    await logActivity({
      action: "activate_storage_option",
      entity_type: "storage_option",
      entity_id: storageKey,
      user,
      status: "FAILED",
      details: { storage_key: storageKey, error: String(error?.message || error) },
    });

    return {
      success: false,
      message: error?.message || "Failed to activate storage option.",
    };
  }
}

/**
 * Server action to execute streaming file migration between storage options.
 */
export async function triggerStorageMigrationAction(
  sourceKey: string,
  targetKey: string,
): Promise<ActionResponse<MigrationResult>> {
  const { user } = await assertPermission("update", "/dashboard/storages");

  const parsed = storageMigrationSchema.safeParse({ sourceKey, targetKey });
  if (!parsed.success) {
    return {
      success: false,
      errors: formatZodErrors(parsed.error),
      message: "Invalid migration parameters.",
    };
  }

  try {
    const result = await migrateStorageFiles(
      parsed.data.sourceKey,
      parsed.data.targetKey,
      Number(user.id || 1),
    );

    revalidatePath("/dashboard/storages");
    revalidatePath("/dashboard/media");
    revalidateTag("storage-options", "max");
    revalidateTag("active-storage", "max");

    await logActivity({
      action: "migrate_storage_files",
      entity_type: "storage_option",
      entity_id: `${parsed.data.sourceKey}->${parsed.data.targetKey}`,
      user,
      status: result.failedCount === 0 ? "SUCCESS" : "FAILED",
      details: {
        sourceKey: parsed.data.sourceKey,
        targetKey: parsed.data.targetKey,
        filesMigrated: result.filesMigrated,
        failedCount: result.failedCount,
        errors: result.errors,
      },
    });

    if (result.failedCount > 0) {
      return {
        success: true,
        message: `Migrated ${result.filesMigrated} files with ${result.failedCount} failures.`,
        data: result,
      };
    }

    return {
      success: true,
      message: `Successfully migrated ${result.filesMigrated} files from '${parsed.data.sourceKey}' to '${parsed.data.targetKey}'.`,
      data: result,
    };
  } catch (error: any) {
    console.error("[triggerStorageMigrationAction] Migration error:", error);
    await logActivity({
      action: "migrate_storage_files",
      entity_type: "storage_option",
      entity_id: `${sourceKey}->${targetKey}`,
      user,
      status: "FAILED",
      details: { sourceKey, targetKey, error: String(error?.message || error) },
    });

    return {
      success: false,
      message: error?.message || "Storage migration failed.",
    };
  }
}
