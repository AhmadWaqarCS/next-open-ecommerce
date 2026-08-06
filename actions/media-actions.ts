"use server";

import { assertPermission } from "@/lib/guards";
import { formatZodErrors, ActionResponse } from "@/lib/action-utils";
import {
  deleteMediaSchema,
  reconnectMediaSchema,
  clearBrokenMediaSchema,
  bulkDeleteMediaSchema,
  DeleteMediaInput,
  ReconnectMediaInput,
  ClearBrokenMediaInput,
  BulkDeleteMediaInput,
} from "@/lib/validations";
import {
  deleteMediaFileFromStorage,
  bulkDeleteMediaFilesFromStorage,
  reconnectMediaInDB,
  clearBrokenImageReferenceInDB,
  removeMediaAndDisconnectInDB,
  saveOptimizedMediaFileInStorage,
} from "@/services/media-services";
import { saveFileToUploads } from "@/services/upload-services";
import { revalidatePath, revalidateTag } from "next/cache";

function revalidateMediaTags(targetType?: string) {
  if (targetType === "category") {
    revalidateTag("page-categories", "max");
    revalidateTag("site-header", "max");
    revalidateTag("hero-banner", "max");
  } else if (
    targetType === "product_variant" ||
    targetType === "product_feature" ||
    targetType === "product_gallery"
  ) {
    revalidateTag("page-products", "max");
    revalidateTag("featured-products", "max");
  } else if (
    targetType === "site_logo_light" ||
    targetType === "site_logo_dark" ||
    targetType === "site_favicon"
  ) {
    revalidateTag("site-config", "max");
    revalidateTag("site-header", "max");
    revalidateTag("site-footer", "max");
    revalidateTag("hero-banner", "max");
  } else {
    revalidateTag("page-categories", "max");
    revalidateTag("page-products", "max");
    revalidateTag("site-config", "max");
  }
}

/**
 * Deletes a media file from physical storage.
 */
export async function deleteMediaAction(input: DeleteMediaInput): Promise<ActionResponse> {
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
    await removeMediaAndDisconnectInDB(validation.data.relativePath, Number(user.id));

    revalidateMediaTags();
    revalidatePath("/dashboard/media");

    return {
      success: true,
      message: `File deleted successfully from storage and DB references cleared.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to delete media file.",
    };
  }
}

/**
 * Reconnects or assigns an existing media image to a target DB entity.
 */
export async function reconnectMediaAction(input: ReconnectMediaInput): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/media");

  const validation = reconnectMediaSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      errors: formatZodErrors(validation.error),
      message: "Validation failed.",
    };
  }

  try {
    await reconnectMediaInDB({
      ...validation.data,
      userId: Number(user.id),
    });

    revalidateMediaTags(validation.data.targetType);
    revalidatePath("/dashboard/media");

    return {
      success: true,
      message: "Media position successfully updated.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to update image connection.",
    };
  }
}

/**
 * Clears or removes a broken image reference from the database.
 */
export async function clearBrokenMediaAction(input: ClearBrokenMediaInput): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/media");

  const validation = clearBrokenMediaSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      errors: formatZodErrors(validation.error),
      message: "Validation failed.",
    };
  }

  try {
    await clearBrokenImageReferenceInDB({
      ...validation.data,
      userId: Number(user.id),
    });

    revalidateMediaTags(validation.data.targetType);
    revalidatePath("/dashboard/media");

    return {
      success: true,
      message: "Broken database image link removed.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to remove broken image link.",
    };
  }
}

/**
 * Bulk deletes multiple media files in controlled batches.
 */
export async function bulkDeleteMediaAction(input: BulkDeleteMediaInput): Promise<ActionResponse> {
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
    const result = await bulkDeleteMediaFilesFromStorage(validation.data.relativePaths, 5);

    revalidateMediaTags();
    revalidatePath("/dashboard/media");

    if (result.failedCount > 0) {
      return {
        success: result.deletedCount > 0,
        message: `Processed bulk deletion: ${result.deletedCount} deleted, ${result.failedCount} failed.`,
      };
    }

    return {
      success: true,
      message: `Successfully bulk deleted ${result.deletedCount} file(s) in batches.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to execute bulk media deletion.",
    };
  }
}

/**
 * Uploads a media file to physical storage under uploads/<folder>.
 */
export async function uploadMediaImage(
  formData: FormData,
  folder: string = "uploads"
): Promise<ActionResponse<{ relativePath: string; fileName: string; size: number }>> {
  await assertPermission("create", "/dashboard/media");

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
      message: "Unsupported file type. Allowed formats: JPEG, PNG, WebP, GIF, SVG, AVIF.",
    };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { success: false, message: "File size exceeds the 10MB limit." };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await saveFileToUploads(
      Buffer.from(arrayBuffer),
      file.name,
      folder
    );

    revalidatePath("/dashboard/media");

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
    return {
      success: false,
      message: error.message || "Failed to save image to disk.",
    };
  }
}

/**
 * Replaces an existing media file with an optimized version.
 */
export async function replaceOptimizedMediaAction(
  formData: FormData
): Promise<ActionResponse<{ relativePath: string; fileName: string; size: number }>> {
  const { user } = await assertPermission("update", "/dashboard/media");

  const oldRelativePath = formData.get("oldRelativePath") as string | null;
  const file = formData.get("file") as File | null;

  if (!oldRelativePath || !file || !(file instanceof File) || file.size === 0) {
    return { success: false, message: "Invalid parameters or no file uploaded." };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await saveOptimizedMediaFileInStorage(
      oldRelativePath,
      Buffer.from(arrayBuffer),
      file.name,
      Number(user.id)
    );

    revalidateMediaTags();
    revalidatePath("/dashboard/media");

    return {
      success: true,
      message: "Media file optimized and replaced successfully.",
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to replace optimized media file.",
    };
  }
}


