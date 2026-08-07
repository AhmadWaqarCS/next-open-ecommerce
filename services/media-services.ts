import path from "node:path";
import { after } from "next/server";
import prisma from "@/lib/prisma";
import { saveMediaToStorage, deleteMediaFromStorage, bulkDeleteMediaFromStorage } from "./storage-services";

/**
 * Deletes a file from storage using origin-detection.
 * Thin wrapper around deleteMediaFromStorage.
 */
export async function deleteMediaFileFromStorage(url: string): Promise<boolean> {
  return await deleteMediaFromStorage(url);
}

/**
 * Deletes multiple files from storage using origin-detection.
 * Thin wrapper around bulkDeleteMediaFromStorage.
 */
export async function bulkDeleteMediaFilesFromStorage(urls: string[], batchSize = 5): Promise<void> {
  await bulkDeleteMediaFromStorage(urls, batchSize);
}

/**
 * Replaces an existing media file with an optimized version and updates all DB references.
 *
 * Lifecycle:
 * 1. Upload the new optimized file to storage → get newUrl
 * 2. On success: run Prisma transaction to update all DB tables that reference oldUrl → newUrl
 * 3. On success of DB update: delete old file from storage (fire-and-forget)
 * 4. On failure at step 1 or 2: do NOT delete old file, return error
 */
export async function replaceOptimizedImageAndUpdateDB(
  oldUrl: string,
  optimizedBuffer: Buffer,
  newFileName: string,
  userId: number
): Promise<{ newUrl: string; fileName: string; size: number }> {
  const oldNorm = oldUrl.trim();

  // Step 1: Upload optimized file to the same subfolder as the old file
  const cleanOldPath = oldNorm
    .replace(/^\/uploads\//, "")
    .replace(/^uploads\//, "")
    .replace(/^\/+/, "")
    .replace(/^https?:\/\/[^/]+\//, ""); // strip any full URL prefix

  const oldFolder = path.dirname(cleanOldPath);
  const destination = oldFolder === "." ? "" : oldFolder;

  const result = await saveMediaToStorage(optimizedBuffer, newFileName, destination);
  if (!result) {
    throw new Error("Failed to upload optimized media file.");
  }

  const newUrl = result.relativePath;

  // Step 2: Update DB references in a single Prisma transaction
  if (oldNorm !== newUrl) {
    await prisma.$transaction(async (tx) => {
      await tx.category.updateMany({
        where: { image_url: oldNorm, deleted_at: null },
        data: { image_url: newUrl, updated_by: userId },
      });

      await tx.product.updateMany({
        where: { feature_image_url: oldNorm, deleted_at: null },
        data: { feature_image_url: newUrl, updated_by: userId },
      });

      await tx.product_image.updateMany({
        where: { url: oldNorm, deleted_at: null },
        data: { url: newUrl, updated_by: userId },
      });

      await tx.product_variant.updateMany({
        where: { image_url: oldNorm, deleted_at: null },
        data: { image_url: newUrl, updated_by: userId },
      });

      const config = await tx.site_config.findFirst({ where: { deleted_at: null } });
      if (config) {
        const updates: Record<string, string | number> = {};
        if (config.light_logo_url === oldNorm) updates.light_logo_url = newUrl;
        if (config.dark_logo_url === oldNorm) updates.dark_logo_url = newUrl;
        if (config.favicon_url === oldNorm) updates.favicon_url = newUrl;
        if (Object.keys(updates).length > 0) {
          updates.updated_by = userId;
          await tx.site_config.update({ where: { id: config.id }, data: updates });
        }
      }
    });
  }

  // Step 3: Delete old file from storage (only after DB commit succeeds)
  if (oldNorm && oldNorm !== newUrl) {
    const doDelete = async () => {
      await deleteMediaFromStorage(oldNorm);
    };
    try {
      after(async () => {
        await doDelete().catch((err) => {
          console.warn(`[Replace Optimized] Failed to delete old file '${oldNorm}':`, err);
        });
      });
    } catch {
      doDelete().catch((err) => {
        console.warn(`[Replace Optimized Fallback] Failed to delete old file '${oldNorm}':`, err);
      });
    }
  }

  return {
    newUrl,
    fileName: result.fileName,
    size: result.size,
  };
}
