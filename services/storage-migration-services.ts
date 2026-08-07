import prisma from "@/lib/prisma";
import { getFlydriveDisk, getAllDiskFiles, verifyStorageEnv } from "@/lib/storage/flydrive";

export interface MigrationResult {
  filesMigrated: number;
  failedCount: number;
  errors: string[];
}

/**
 * Migrates files from Source Storage to Target Storage using Flydrive
 * and updates media references in the database.
 * Protected by environment variable & accessibility guards for both source & target storages.
 */
export async function migrateStorageFiles(
  sourceKey: string,
  targetKey: string,
  userId: number
): Promise<MigrationResult> {
  if (sourceKey === targetKey) {
    throw new Error("Source and target storage options must be different.");
  }

  // 1. Verify ENV & accessibility of source storage
  const sourceCheck = await verifyStorageEnv(sourceKey);
  if (!sourceCheck.valid) {
    throw new Error(
      `Source storage '${sourceKey}' is inaccessible or has missing environment variables: ${sourceCheck.error}`
    );
  }

  // 2. Verify ENV & accessibility of target storage
  const targetCheck = await verifyStorageEnv(targetKey);
  if (!targetCheck.valid) {
    throw new Error(
      `Target storage '${targetKey}' is inaccessible or has missing environment variables: ${targetCheck.error}`
    );
  }

  const sourceDisk = getFlydriveDisk(sourceKey);
  const targetDisk = getFlydriveDisk(targetKey);

  const errors: string[] = [];
  let filesMigrated = 0;
  let failedCount = 0;

  // 1. Gather files from source storage
  let sourceFiles: { key: string; name: string }[] = [];
  try {
    sourceFiles = await getAllDiskFiles(sourceDisk);
  } catch (err: any) {
    throw new Error(`Failed to list files from source storage '${sourceKey}': ${err?.message}`);
  }

  // 2. Transfer files from sourceDisk to targetDisk in chunks
  const BATCH_SIZE = 5;
  for (let i = 0; i < sourceFiles.length; i += BATCH_SIZE) {
    const chunk = sourceFiles.slice(i, i + BATCH_SIZE);

    await Promise.all(
      chunk.map(async (fileItem) => {
        try {
          const fileBytes = await sourceDisk.getBytes(fileItem.key);
          await targetDisk.put(fileItem.key, fileBytes);
          filesMigrated += 1;
        } catch (err: any) {
          failedCount += 1;
          errors.push(`Failed to copy file '${fileItem.key}': ${err?.message || "Unknown error"}`);
        }
      })
    );
  }

  // 3. Retrieve storage options to check custom CDN URL prefixes if any
  const [sourceOption, targetOption] = await Promise.all([
    prisma.storage_option.findUnique({ where: { key: sourceKey } }),
    prisma.storage_option.findUnique({ where: { key: targetKey } }),
  ]);

  const sourceCdn = sourceOption?.cdn_url ? sourceOption.cdn_url.replace(/\/+$/, "") : null;
  const targetCdn = targetOption?.cdn_url ? targetOption.cdn_url.replace(/\/+$/, "") : null;

  // 4. Update DB image references if CDN prefixes differ
  if (sourceCdn || targetCdn) {
    await prisma.$transaction(async (tx) => {
      if (sourceCdn && targetCdn && sourceCdn !== targetCdn) {
        // Replace source CDN prefix with target CDN prefix
        const categories = await tx.category.findMany({
          where: { image_url: { startsWith: sourceCdn }, deleted_at: null },
        });
        for (const cat of categories) {
          if (cat.image_url) {
            await tx.category.update({
              where: { id: cat.id },
              data: {
                image_url: cat.image_url.replace(sourceCdn, targetCdn),
                updated_by: userId,
              },
            });
          }
        }

        const products = await tx.product.findMany({
          where: { feature_image_url: { startsWith: sourceCdn }, deleted_at: null },
        });
        for (const prod of products) {
          if (prod.feature_image_url) {
            await tx.product.update({
              where: { id: prod.id },
              data: {
                feature_image_url: prod.feature_image_url.replace(sourceCdn, targetCdn),
                updated_by: userId,
              },
            });
          }
        }

        const productImages = await tx.product_image.findMany({
          where: { url: { startsWith: sourceCdn }, deleted_at: null },
        });
        for (const img of productImages) {
          if (img.url) {
            await tx.product_image.update({
              where: { id: img.id },
              data: {
                url: img.url.replace(sourceCdn, targetCdn),
                updated_by: userId,
              },
            });
          }
        }

        const productVariants = await tx.product_variant.findMany({
          where: { image_url: { startsWith: sourceCdn }, deleted_at: null },
        });
        for (const v of productVariants) {
          if (v.image_url) {
            await tx.product_variant.update({
              where: { id: v.id },
              data: {
                image_url: v.image_url.replace(sourceCdn, targetCdn),
                updated_by: userId,
              },
            });
          }
        }
      }
    });
  }

  // Log activity
  await prisma.activity_log.create({
    data: {
      action: "MIGRATE_STORAGE_FILES",
      entity_type: "storage_option",
      entity_id: `${sourceKey}->${targetKey}`,
      user_id: userId,
      status: failedCount === 0 ? "SUCCESS" : "WARNING",
      details: {
        sourceKey,
        targetKey,
        filesMigrated,
        failedCount,
        errors,
      },
    },
  });

  return {
    filesMigrated,
    failedCount,
    errors,
  };
}
