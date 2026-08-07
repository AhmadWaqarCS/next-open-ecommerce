"use server";

import path from "node:path";
import { assertPermission } from "@/lib/guards";
import {
  formatZodErrors,
  ActionResponse,
  logActivity,
} from "@/lib/action-utils";
import {
  deleteMediaSchema,
  bulkDeleteMediaSchema,
  fetchStorageFilesSchema,
  replaceOptimizedImageSchema,
  DeleteMediaInput,
  BulkDeleteMediaInput,
} from "@/lib/validations";
import {
  deleteMediaFileFromStorage,
  bulkDeleteMediaFilesFromStorage,
  replaceOptimizedImageAndUpdateDB,
} from "@/services/media-services";
import {
  saveMediaToStorage,
  extractFileKeyFromUrl,
  getPublicUrlForStorageKey,
} from "@/services/storage-services";
import {
  getActiveFlydriveDisk,
  getFlydriveDisk,
  getAllDiskFiles,
} from "@/lib/storage/flydrive";
import { StorageFileItem, DBImageRecord } from "@/lib/media-types";
import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * Deletes a single media file from storage (origin-aware). Does NOT cascade clear DB references.
 */
export async function deleteMediaAction(
  input: DeleteMediaInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/media");

  const validation = deleteMediaSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      errors: formatZodErrors(validation.error),
      message: "Validation failed.",
    };
  }

  try {
    await deleteMediaFileFromStorage(validation.data.relativePath);

    await logActivity({
      action: "delete_media",
      entity_type: "media",
      entity_id: validation.data.relativePath,
      user,
      status: "SUCCESS",
      details: { relativePath: validation.data.relativePath },
    });

    return {
      success: true,
      message: "File deleted from storage.",
    };
  } catch (error: any) {
    await logActivity({
      action: "delete_media",
      entity_type: "media",
      user,
      status: "FAILED",
      details: {
        relativePath: validation.data.relativePath,
        error: String(error),
      },
    });
    return {
      success: false,
      message: error.message || "Failed to delete media file.",
    };
  }
}

/**
 * Bulk deletes multiple media files from storage in batches. Does NOT cascade clear DB references.
 */
export async function bulkDeleteMediaAction(
  input: BulkDeleteMediaInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/media");

  const validation = bulkDeleteMediaSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      errors: formatZodErrors(validation.error),
      message: "Validation failed.",
    };
  }

  try {
    await bulkDeleteMediaFilesFromStorage(validation.data.relativePaths, 5);

    await logActivity({
      action: "bulk_delete_media",
      entity_type: "media",
      user,
      status: "SUCCESS",
      details: { count: validation.data.relativePaths.length },
    });

    return {
      success: true,
      message: `Successfully deleted ${validation.data.relativePaths.length} file(s).`,
    };
  } catch (error: any) {
    await logActivity({
      action: "bulk_delete_media",
      entity_type: "media",
      user,
      status: "FAILED",
      details: { error: String(error) },
    });
    return {
      success: false,
      message: error.message || "Failed to execute bulk media deletion.",
    };
  }
}

// ─── UPLOAD ───────────────────────────────────────────────────────────────────

/**
 * Uploads a media file to active storage under a specified folder.
 */
export async function uploadMediaImage(
  formData: FormData,
  folder: string = "uploads",
): Promise<
  ActionResponse<{ relativePath: string; fileName: string; size: number }>
> {
  const { user } = await assertPermission("create", "/dashboard/media");

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false, message: "No file selected or invalid file." };
  }

  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/avif",
  ];
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      message:
        "Unsupported file type. Allowed formats: JPEG, PNG, WebP, GIF, SVG, AVIF.",
    };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { success: false, message: "File size exceeds the 10MB limit." };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await saveMediaToStorage(
      Buffer.from(arrayBuffer),
      file.name,
      folder,
    );
    if (!result) {
      return {
        success: false,
        message: "Failed to save uploaded file to active storage.",
      };
    }

    await logActivity({
      action: "upload_media_image",
      entity_type: "media",
      user,
      status: "SUCCESS",
      details: { relativePath: result.relativePath, fileName: result.fileName },
    });

    return {
      success: true,
      message: "Image uploaded successfully.",
      data: {
        relativePath: result.relativePath,
        fileName: result.fileName,
        size: result.size,
      },
    };
  } catch (error: any) {
    await logActivity({
      action: "upload_media_image",
      entity_type: "media",
      user,
      status: "FAILED",
      details: { fileName: file.name, error: String(error) },
    });
    return {
      success: false,
      message: error.message || "Failed to save image to storage.",
    };
  }
}

// ─── OPTIMIZE ─────────────────────────────────────────────────────────────────

/**
 * Replaces an existing media file with an optimized version.
 * Uploads new file, updates all DB references from old URL to new URL, then deletes old file.
 */
export async function replaceOptimizedImageAction(
  formData: FormData,
): Promise<ActionResponse<{ newUrl: string; fileName: string; size: number }>> {
  const { user } = await assertPermission("update", "/dashboard/media");

  const oldUrl = formData.get("oldUrl") as string | null;
  const file = formData.get("file") as File | null;

  const validation = replaceOptimizedImageSchema.safeParse({ oldUrl });
  if (
    !validation.success ||
    !file ||
    !(file instanceof File) ||
    file.size === 0
  ) {
    return {
      success: false,
      message: "Invalid parameters or no optimized file uploaded.",
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await replaceOptimizedImageAndUpdateDB(
      validation.data.oldUrl,
      Buffer.from(arrayBuffer),
      file.name,
      Number(user.id),
    );

    // Revalidate relevant storefront caches
    revalidateTag("page-categories", "max");
    revalidateTag("page-products", "max");
    revalidateTag("site-config", "max");
    revalidatePath("/dashboard/media");

    await logActivity({
      action: "replace_optimized_media",
      entity_type: "media",
      user,
      status: "SUCCESS",
      details: { oldUrl: validation.data.oldUrl, newUrl: result.newUrl },
    });

    return {
      success: true,
      message: "Media file optimized and replaced successfully.",
      data: result,
    };
  } catch (error: any) {
    await logActivity({
      action: "replace_optimized_media",
      entity_type: "media",
      user,
      status: "FAILED",
      details: { oldUrl, error: String(error) },
    });
    return {
      success: false,
      message: error.message || "Failed to replace optimized media file.",
    };
  }
}

// ─── GALLERY FETCH ────────────────────────────────────────────────────────────

/**
 * Fetches all files from a specific storage medium lazily.
 * Returns StorageFileItem[] for that storage key only.
 */
export async function fetchStorageFilesAction(
  storageKey: string,
): Promise<ActionResponse<{ files: StorageFileItem[] }>> {
  await assertPermission("read", "/dashboard/media");

  const validation = fetchStorageFilesSchema.safeParse({ storageKey });
  if (!validation.success) {
    return { success: false, message: "Invalid storage key." };
  }

  try {
    const key = validation.data.storageKey;
    const disk = getFlydriveDisk(key);
    const rawFiles = await getAllDiskFiles(disk);

    const cdnUrl = process.env.STORAGE_CDN_URL || null;

    const files: StorageFileItem[] = rawFiles.map((f) => {
      const fileKey = f.key.replace(/^\/+/, "");
      const parts = fileKey.split("/");
      const fileName = parts[parts.length - 1];
      const subfolder =
        parts.length > 1 ? parts.slice(0, -1).join("/") : "root";
      const url = getPublicUrlForStorageKey(key, fileKey, cdnUrl);

      return {
        url,
        key: fileKey,
        storageMedium: key,
        storageName: formatStorageName(key),
        fileName,
        subfolder,
      };
    });

    return {
      success: true,
      data: { files },
    };
  } catch (error: any) {
    return {
      success: false,
      message:
        error.message || `Failed to fetch files from '${storageKey}' storage.`,
    };
  }
}

function formatStorageName(key: string): string {
  const names: Record<string, string> = {
    local: "Local Disk",
    google_cloud: "Google Cloud Storage",
    aws_s3: "Amazon S3",
    cloudflare_r2: "Cloudflare R2",
    minio: "MinIO",
  };
  return names[key] || key;
}

/**
 * Fetches all image URLs referenced in the database, grouped by table.
 * Returns a flat list of DBImageRecord[] for client-side analysis.
 */
export async function fetchDBImageUrlsAction(): Promise<
  ActionResponse<{ images: DBImageRecord[] }>
> {
  await assertPermission("read", "/dashboard/media");

  try {
    const images: DBImageRecord[] = [];

    // Run all queries in a single transaction for consistency
    await prisma.$transaction(async (tx) => {
      // 1. Categories
      const categories = await tx.category.findMany({
        where: { deleted_at: null, image_url: { not: null } },
        select: { id: true, name: true, image_url: true },
      });
      for (const c of categories) {
        if (c.image_url) {
          images.push({
            url: c.image_url,
            table: "category",
            entityId: c.id,
            entityName: c.name,
            fieldName: "image_url",
          });
        }
      }

      // 2. Product feature images
      const products = await tx.product.findMany({
        where: { deleted_at: null, feature_image_url: { not: null } },
        select: { id: true, name: true, feature_image_url: true },
      });
      for (const p of products) {
        if (p.feature_image_url) {
          images.push({
            url: p.feature_image_url,
            table: "product",
            entityId: p.id,
            entityName: p.name,
            fieldName: "feature_image_url",
          });
        }
      }

      // 3. Product gallery images
      const productImages = await tx.product_image.findMany({
        where: { deleted_at: null },
        select: {
          id: true,
          url: true,
          product: { select: { id: true, name: true } },
        },
      });
      for (const img of productImages) {
        if (img.url) {
          images.push({
            url: img.url,
            table: "product_image",
            entityId: img.product?.id,
            entityName: img.product?.name,
            fieldName: "url",
          });
        }
      }

      // 4. Product variant images
      const variants = await tx.product_variant.findMany({
        where: { deleted_at: null, image_url: { not: null } },
        select: {
          id: true,
          name: true,
          image_url: true,
          product: { select: { id: true, name: true } },
        },
      });
      for (const v of variants) {
        if (v.image_url) {
          images.push({
            url: v.image_url,
            table: "product_variant",
            entityId: v.id,
            entityName: `${v.product?.name ?? ""} / ${v.name}`,
            fieldName: "image_url",
          });
        }
      }

      // 5. Site config logos/favicon
      const config = await tx.site_config.findFirst({
        where: { deleted_at: null },
      });
      if (config) {
        const fields: Array<{ key: keyof typeof config; label: string }> = [
          { key: "light_logo_url", label: "Light Logo" },
          { key: "dark_logo_url", label: "Dark Logo" },
          { key: "favicon_url", label: "Favicon" },
        ];
        for (const { key, label } of fields) {
          const val = config[key] as string | null;
          if (val) {
            images.push({
              url: val,
              table: "site_config",
              entityId: config.id,
              entityName: label,
              fieldName: key,
            });
          }
        }
      }
    });

    return {
      success: true,
      data: { images },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to fetch DB image URLs.",
    };
  }
}

// ─── CORS BYPASS FOR REMOTE OPTIMIZATION ─────────────────────────────────────

/**
 * Server-side proxy action for fetching remote media files (GCP, S3, etc.) when browser CORS blocks client fetch.
 * Runs on Node.js where CORS rules do not apply.
 */
export async function fetchRemoteMediaFileAction(
  url: string,
): Promise<
  ActionResponse<{ base64: string; mimeType: string; fileName: string }>
> {
  await assertPermission("read", "/dashboard/media");

  if (!url || typeof url !== "string") {
    return { success: false, message: "Invalid URL." };
  }

  try {
    const cleanKey = extractFileKeyFromUrl(url);
    let buffer: Buffer | null = null;

    // Direct HTTP fetch on Node.js (CORS-free)
    if (url.startsWith("http://") || url.startsWith("https://")) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          buffer = Buffer.from(await res.arrayBuffer());
        }
      } catch {
        // ignore
      }
    }

    // Try active Flydrive disk if HTTP fetch failed or URL is relative
    if (!buffer && cleanKey) {
      try {
        const { disk: activeDisk } = await getActiveFlydriveDisk();
        if (await activeDisk.exists(cleanKey)) {
          const bytes = await activeDisk.get(cleanKey);
          buffer = Buffer.from(bytes);
        }
      } catch {
        // ignore
      }
    }

    if (!buffer) {
      return { success: false, message: "Could not locate remote image file." };
    }

    const fileName = path.basename(cleanKey || url) || "image.png";
    const ext = path.extname(fileName).toLowerCase();
    let mimeType = "image/png";
    if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
    else if (ext === ".webp") mimeType = "image/webp";
    else if (ext === ".gif") mimeType = "image/gif";
    else if (ext === ".avif") mimeType = "image/avif";
    else if (ext === ".svg") mimeType = "image/svg+xml";

    return {
      success: true,
      data: {
        base64: `data:${mimeType};base64,${buffer.toString("base64")}`,
        mimeType,
        fileName,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to load remote media file.",
    };
  }
}
