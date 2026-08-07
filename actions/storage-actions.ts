"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPermission } from "@/lib/guards";
import { ActionResponse } from "@/lib/action-utils";
import { verifyStorageEnv } from "@/lib/storage/flydrive";
import { activateStorageOptionInDB } from "@/services/storage-services";
import { migrateStorageFiles } from "@/services/storage-migration-services";

const keySchema = z.object({
  storageKey: z.string().min(1, "Storage key is required."),
});

const migrationSchema = z.object({
  sourceKey: z.string().min(1, "Source storage key is required."),
  targetKey: z.string().min(1, "Target storage key is required."),
});

/**
 * Server action to verify environment variables for a storage option.
 */
export async function verifyStorageEnvAction(storageKey: string) {
  await assertPermission("read", "/dashboard/storages");

  const parsed = keySchema.safeParse({ storageKey });
  if (!parsed.success) {
    return {
      success: false,
      valid: false,
      error: "Invalid storage key provided.",
      envStatus: {},
    };
  }

  const check = await verifyStorageEnv(parsed.data.storageKey);
  return {
    success: true,
    valid: check.valid,
    error: check.error,
    envStatus: check.envStatus,
  };
}

/**
 * Server action to activate a storage option as the primary write target.
 */
export async function activateStorageAction(storageKey: string): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/storages");

  const parsed = keySchema.safeParse({ storageKey });
  if (!parsed.success) {
    return {
      success: false,
      errors: { storageKey: "Invalid storage key." },
      message: "Validation failed.",
    };
  }

  try {
    const updated = await activateStorageOptionInDB(parsed.data.storageKey, Number(user.id || 1));
    revalidatePath("/dashboard/storages");
    revalidatePath("/dashboard/media");

    return {
      success: true,
      message: `'${updated.name}' activated as primary storage option.`,
    };
  } catch (error: any) {
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
  targetKey: string
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/storages");

  const parsed = migrationSchema.safeParse({ sourceKey, targetKey });
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid source or target storage key.",
    };
  }

  try {
    const result = await migrateStorageFiles(
      parsed.data.sourceKey,
      parsed.data.targetKey,
      Number(user.id || 1)
    );

    revalidatePath("/dashboard/storages");
    revalidatePath("/dashboard/media");

    if (result.failedCount > 0) {
      return {
        success: true,
        message: `Migrated ${result.filesMigrated} files with ${result.failedCount} failures. Check activity logs for details.`,
      };
    }

    return {
      success: true,
      message: `Successfully migrated ${result.filesMigrated} files from '${sourceKey}' to '${targetKey}'.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Migration failed.",
    };
  }
}
