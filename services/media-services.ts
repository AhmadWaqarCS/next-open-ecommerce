import fs from "node:fs/promises";
import path from "node:path";
import prisma from "@/lib/prisma";
import { saveFileToUploads } from "./upload-services";

/**
 * Deletes a physical file from storage (currently disk IO uploads folder).
 * Highly modular & ready to support blob / cloud storage bucket implementations.
 *
 * @param relativePath Relative URL path of the file (e.g. "/uploads/products/image.png")
 */
export async function deleteMediaFileFromStorage(relativePath: string): Promise<boolean> {
  if (!relativePath) {
    throw new Error("File path is required.");
  }

  const uploadsDir = path.join(process.cwd(), "uploads");

  let cleanRelPath = relativePath.trim();
  if (cleanRelPath.startsWith("/uploads/")) {
    cleanRelPath = cleanRelPath.replace(/^\/uploads\//, "");
  } else if (cleanRelPath.startsWith("uploads/")) {
    cleanRelPath = cleanRelPath.replace(/^uploads\//, "");
  } else if (cleanRelPath.startsWith("/")) {
    cleanRelPath = cleanRelPath.replace(/^\/+/, "");
  }

  const targetPath = path.resolve(uploadsDir, cleanRelPath);

  // Security guard against path traversal attacks outside uploads directory
  if (!targetPath.startsWith(path.resolve(uploadsDir))) {
    throw new Error("Security Error: Target path must remain inside the uploads directory.");
  }

  try {
    await fs.unlink(targetPath);
    return true;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return true;
    }
    throw error;
  }
}

/**
 * Reconnects/assigns an image URL to a target database entity inside a single Prisma transaction.
 */
export async function reconnectMediaInDB(data: {
  relativePath: string;
  targetType:
    | "category"
    | "product_feature"
    | "product_gallery"
    | "product_variant"
    | "site_logo_light"
    | "site_logo_dark"
    | "site_favicon";
  targetId?: number | null;
  altText?: string | null;
  userId: number;
}) {
  const { relativePath, targetType, targetId, altText, userId } = data;

  return await prisma.$transaction(async (tx) => {
    switch (targetType) {
      case "category": {
        if (!targetId) throw new Error("Category ID is required.");
        return await tx.category.update({
          where: { id: targetId },
          data: {
            image_url: relativePath,
            image_alt_text: altText ?? undefined,
            updated_by: userId,
          },
        });
      }

      case "product_feature": {
        if (!targetId) throw new Error("Product ID is required.");
        return await tx.product.update({
          where: { id: targetId },
          data: {
            feature_image_url: relativePath,
            feature_image_alt_text: altText ?? undefined,
            updated_by: userId,
          },
        });
      }

      case "product_gallery": {
        if (!targetId) throw new Error("Product ID is required.");
        return await tx.product_image.create({
          data: {
            product_id: targetId,
            url: relativePath,
            alt_text: altText ?? undefined,
            created_by: userId,
            updated_by: userId,
          },
        });
      }

      case "product_variant": {
        if (!targetId) throw new Error("Variant ID is required.");
        return await tx.product_variant.update({
          where: { id: targetId },
          data: {
            image_url: relativePath,
            image_url_alt_text: altText ?? undefined,
            updated_by: userId,
          },
        });
      }

      case "site_logo_light": {
        const config = await tx.site_config.findFirst({ where: { deleted_at: null } });
        if (!config) throw new Error("Site configuration not found.");
        return await tx.site_config.update({
          where: { id: config.id },
          data: {
            light_logo_url: relativePath,
            updated_by: userId,
          },
        });
      }

      case "site_logo_dark": {
        const config = await tx.site_config.findFirst({ where: { deleted_at: null } });
        if (!config) throw new Error("Site configuration not found.");
        return await tx.site_config.update({
          where: { id: config.id },
          data: {
            dark_logo_url: relativePath,
            updated_by: userId,
          },
        });
      }

      case "site_favicon": {
        const config = await tx.site_config.findFirst({ where: { deleted_at: null } });
        if (!config) throw new Error("Site configuration not found.");
        return await tx.site_config.update({
          where: { id: config.id },
          data: {
            favicon_url: relativePath,
            updated_by: userId,
          },
        });
      }

      default:
        throw new Error("Unsupported target entity type.");
    }
  });
}

/**
 * Clears or removes a broken image URL reference from the database inside a single Prisma transaction.
 */
export async function clearBrokenImageReferenceInDB(data: {
  targetType:
    | "category"
    | "product_feature"
    | "product_gallery"
    | "product_variant"
    | "site_logo_light"
    | "site_logo_dark"
    | "site_favicon";
  targetId?: number | null;
  galleryImageId?: number | null;
  userId: number;
}) {
  const { targetType, targetId, galleryImageId, userId } = data;

  return await prisma.$transaction(async (tx) => {
    switch (targetType) {
      case "category": {
        if (!targetId) throw new Error("Category ID is required.");
        return await tx.category.update({
          where: { id: targetId },
          data: { image_url: null, updated_by: userId },
        });
      }

      case "product_feature": {
        if (!targetId) throw new Error("Product ID is required.");
        return await tx.product.update({
          where: { id: targetId },
          data: { feature_image_url: null, updated_by: userId },
        });
      }

      case "product_gallery": {
        if (!galleryImageId) throw new Error("Gallery Image ID is required.");
        return await tx.product_image.delete({
          where: { id: galleryImageId },
        });
      }

      case "product_variant": {
        if (!targetId) throw new Error("Variant ID is required.");
        return await tx.product_variant.update({
          where: { id: targetId },
          data: { image_url: null, updated_by: userId },
        });
      }

      case "site_logo_light": {
        const config = await tx.site_config.findFirst({ where: { deleted_at: null } });
        if (!config) throw new Error("Site configuration not found.");
        return await tx.site_config.update({
          where: { id: config.id },
          data: { light_logo_url: null, updated_by: userId },
        });
      }

      case "site_logo_dark": {
        const config = await tx.site_config.findFirst({ where: { deleted_at: null } });
        if (!config) throw new Error("Site configuration not found.");
        return await tx.site_config.update({
          where: { id: config.id },
          data: { dark_logo_url: null, updated_by: userId },
        });
      }

      case "site_favicon": {
        const config = await tx.site_config.findFirst({ where: { deleted_at: null } });
        if (!config) throw new Error("Site configuration not found.");
        return await tx.site_config.update({
          where: { id: config.id },
          data: { favicon_url: null, updated_by: userId },
        });
      }

      default:
        throw new Error("Unsupported target entity type.");
    }
  });
}

/**
 * Deletes multiple physical files from storage in batches to avoid CPU/IO saturation or crashes.
 *
 * @param relativePaths List of relative file paths to delete
 * @param batchSize Number of files per batch (default: 5)
 */
export async function bulkDeleteMediaFilesFromStorage(
  relativePaths: string[],
  batchSize = 5
): Promise<{ deletedCount: number; failedCount: number; errors: string[] }> {
  if (!relativePaths || relativePaths.length === 0) {
    return { deletedCount: 0, failedCount: 0, errors: [] };
  }

  let deletedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < relativePaths.length; i += batchSize) {
    const chunk = relativePaths.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      chunk.map((pathStr) => deleteMediaFileFromStorage(pathStr))
    );

    batchResults.forEach((res, idx) => {
      if (res.status === "fulfilled") {
        deletedCount++;
      } else {
        failedCount++;
        errors.push(
          `Failed to delete ${chunk[idx]}: ${res.reason?.message || "Unknown error"}`
        );
      }
    });
  }

  return { deletedCount, failedCount, errors };
}

export async function getMediaDashboardDataInDB() {
  return await prisma.$transaction(async (tx) => {
    const categories = await tx.category.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });

    const products = await tx.product.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        variants: {
          where: { deleted_at: null },
          select: { id: true, name: true, sku: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return { categories, products };
  });
}

/**
 * Clears or removes all DB references matching a relative path inside a single Prisma transaction.
 */
export async function removeMediaAndDisconnectInDB(relativePath: string, userId: number) {
  const norm = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;

  return await prisma.$transaction(async (tx) => {
    // 1. Clear category image_url
    await tx.category.updateMany({
      where: { image_url: norm, deleted_at: null },
      data: { image_url: null, updated_by: userId },
    });

    // 2. Clear product feature_image_url
    await tx.product.updateMany({
      where: { feature_image_url: norm, deleted_at: null },
      data: { feature_image_url: null, updated_by: userId },
    });

    // 3. Delete product_image records
    await tx.product_image.deleteMany({
      where: { url: norm, deleted_at: null },
    });

    // 4. Clear product_variant image_url
    await tx.product_variant.updateMany({
      where: { image_url: norm, deleted_at: null },
      data: { image_url: null, updated_by: userId },
    });

    // 5. Clear site_config logo/favicon URLs
    const config = await tx.site_config.findFirst({ where: { deleted_at: null } });
    if (config) {
      const updates: any = {};
      if (config.light_logo_url === norm) updates.light_logo_url = null;
      if (config.dark_logo_url === norm) updates.dark_logo_url = null;
      if (config.favicon_url === norm) updates.favicon_url = null;
      if (Object.keys(updates).length > 0) {
        updates.updated_by = userId;
        await tx.site_config.update({ where: { id: config.id }, data: updates });
      }
    }
  });
}

/**
 * Overwrites/replaces a physical media file on disk with an optimized version.
 * If the file extension/path changes (e.g. .jpg -> .webp), updates DB connections to point to the new path in a single Prisma transaction, and deletes the old file.
 */
export async function saveOptimizedMediaFileInStorage(
  oldRelativePath: string,
  optimizedFileBuffer: Buffer,
  newFileName: string,
  userId: number
): Promise<{ relativePath: string; fileName: string; size: number }> {
  let cleanOldPath = oldRelativePath.trim().replace(/^\/uploads\//, "").replace(/^uploads\//, "").replace(/^\/+/, "");
  const oldFolder = path.dirname(cleanOldPath); // e.g. "products/2026/08" or "categories"

  // Save the optimized binary to disk using the old folder structure
  const result = await saveFileToUploads(optimizedFileBuffer, newFileName, oldFolder === "." ? "" : oldFolder);

  const oldNorm = oldRelativePath.startsWith("/") ? oldRelativePath : `/${oldRelativePath}`;
  const newNorm = result.relativePath;

  // If the file path changed (e.g., extension changed from .jpg to .webp), update DB references in a single transaction and delete old file
  if (oldNorm !== newNorm) {
    await prisma.$transaction(async (tx) => {
      await tx.category.updateMany({
        where: { image_url: oldNorm, deleted_at: null },
        data: { image_url: newNorm, updated_by: userId },
      });

      await tx.product.updateMany({
        where: { feature_image_url: oldNorm, deleted_at: null },
        data: { feature_image_url: newNorm, updated_by: userId },
      });

      await tx.product_image.updateMany({
        where: { url: oldNorm, deleted_at: null },
        data: { url: newNorm, updated_by: userId },
      });

      await tx.product_variant.updateMany({
        where: { image_url: oldNorm, deleted_at: null },
        data: { image_url: newNorm, updated_by: userId },
      });

      const config = await tx.site_config.findFirst({ where: { deleted_at: null } });
      if (config) {
        const updates: any = {};
        if (config.light_logo_url === oldNorm) updates.light_logo_url = newNorm;
        if (config.dark_logo_url === oldNorm) updates.dark_logo_url = newNorm;
        if (config.favicon_url === oldNorm) updates.favicon_url = newNorm;
        if (Object.keys(updates).length > 0) {
          updates.updated_by = userId;
          await tx.site_config.update({ where: { id: config.id }, data: updates });
        }
      }
    });

    // Delete old physical file from disk
    try {
      await deleteMediaFileFromStorage(oldNorm);
    } catch {
      // ignore if old file was already unlinked
    }
  }

  return {
    relativePath: newNorm,
    fileName: result.fileName,
    size: result.size,
  };
}

