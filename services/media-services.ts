import fs from "node:fs/promises";
import path from "node:path";
import prisma from "@/lib/prisma";

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
 * Reconnects/assigns an image URL to a target database entity.
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

  switch (targetType) {
    case "category": {
      if (!targetId) throw new Error("Category ID is required.");
      return await prisma.category.update({
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
      return await prisma.product.update({
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
      return await prisma.product_image.create({
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
      return await prisma.product_variant.update({
        where: { id: targetId },
        data: {
          image_url: relativePath,
          image_url_alt_text: altText ?? undefined,
          updated_by: userId,
        },
      });
    }

    case "site_logo_light": {
      const config = await prisma.site_config.findFirst({ where: { deleted_at: null } });
      if (!config) throw new Error("Site configuration not found.");
      return await prisma.site_config.update({
        where: { id: config.id },
        data: {
          light_logo_url: relativePath,
          updated_by: userId,
        },
      });
    }

    case "site_logo_dark": {
      const config = await prisma.site_config.findFirst({ where: { deleted_at: null } });
      if (!config) throw new Error("Site configuration not found.");
      return await prisma.site_config.update({
        where: { id: config.id },
        data: {
          dark_logo_url: relativePath,
          updated_by: userId,
        },
      });
    }

    case "site_favicon": {
      const config = await prisma.site_config.findFirst({ where: { deleted_at: null } });
      if (!config) throw new Error("Site configuration not found.");
      return await prisma.site_config.update({
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
}

/**
 * Clears or removes a broken image URL reference from the database.
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

  switch (targetType) {
    case "category": {
      if (!targetId) throw new Error("Category ID is required.");
      return await prisma.category.update({
        where: { id: targetId },
        data: { image_url: null, updated_by: userId },
      });
    }

    case "product_feature": {
      if (!targetId) throw new Error("Product ID is required.");
      return await prisma.product.update({
        where: { id: targetId },
        data: { feature_image_url: null, updated_by: userId },
      });
    }

    case "product_gallery": {
      if (!galleryImageId) throw new Error("Gallery Image ID is required.");
      return await prisma.product_image.delete({
        where: { id: galleryImageId },
      });
    }

    case "product_variant": {
      if (!targetId) throw new Error("Variant ID is required.");
      return await prisma.product_variant.update({
        where: { id: targetId },
        data: { image_url: null, updated_by: userId },
      });
    }

    case "site_logo_light": {
      const config = await prisma.site_config.findFirst({ where: { deleted_at: null } });
      if (!config) throw new Error("Site configuration not found.");
      return await prisma.site_config.update({
        where: { id: config.id },
        data: { light_logo_url: null, updated_by: userId },
      });
    }

    case "site_logo_dark": {
      const config = await prisma.site_config.findFirst({ where: { deleted_at: null } });
      if (!config) throw new Error("Site configuration not found.");
      return await prisma.site_config.update({
        where: { id: config.id },
        data: { dark_logo_url: null, updated_by: userId },
      });
    }

    case "site_favicon": {
      const config = await prisma.site_config.findFirst({ where: { deleted_at: null } });
      if (!config) throw new Error("Site configuration not found.");
      return await prisma.site_config.update({
        where: { id: config.id },
        data: { favicon_url: null, updated_by: userId },
      });
    }

    default:
      throw new Error("Unsupported target entity type.");
  }
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

