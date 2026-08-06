"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  CategoryCreateInput,
  CategoryUpdateInput,
  categoryCreateSchema,
  categoryUpdateSchema,
} from "@/lib/validations";
import {
  createCategoryTransaction,
  updateCategoryTransaction,
  deleteCategoryTransaction,
  restoreCategoryTransaction,
  permanentlyDeleteCategoryTransaction,
  bulkDeleteCategoriesTransaction,
  bulkRestoreCategoriesTransaction,
  bulkPermanentlyDeleteCategoriesTransaction,
} from "@/services/category-services";
import { bulkDeleteMediaFilesFromStorage } from "@/services/media-services";
import { saveFileToUploads } from "@/services/upload-services";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  CategoryFilterParams,
  getCategoryFilterWhere,
} from "@/lib/filters/category-filters";

export async function uploadCategoryImage(
  formData: FormData,
): Promise<ActionResponse<{ relativePath: string }>> {
  await assertPermission("create", "/dashboard/categories");

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
        "Unsupported file type. Please upload a JPEG, PNG, WebP, GIF, SVG, or AVIF image.",
    };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { success: false, message: "File size exceeds the 5MB limit." };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.name.split(".").pop()?.toLowerCase() || "webp";
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const fileName = `${Date.now()}_${randomDigits}.${ext}`;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const destination = `categories/${year}/${month}`;

    const uploadResult = await saveFileToUploads(buffer, fileName, destination);

    await logActivity({
      action: "upload_category_image",
      entity_type: "category",
      details: { fileName: file.name, relativePath: uploadResult.relativePath },
    });

    return {
      success: true,
      message: "Image uploaded successfully.",
      data: { relativePath: uploadResult.relativePath },
    };
  } catch (error) {
    console.error("Error uploading category image:", error);
    await logActivity({
      action: "upload_category_image",
      entity_type: "category",
      status: "FAILED",
      details: { fileName: file.name, error: String(error) },
    });
    return { success: false, message: "Failed to save uploaded image." };
  }
}

export async function createCategory(
  data: CategoryCreateInput & { image_url?: string | null },
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/categories");

  const validatedFields = categoryCreateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const { image_url } = data;
  const {
    name,
    slug,
    description,
    image_alt_text,
    bg_color,
    show_in_header,
    show_in_footer,
    show_in_home,
    parent_id,
    sort_order,
    is_active,
    meta_info,
  } = validatedFields.data;

  try {
    const { parentSlug } = await createCategoryTransaction(
      {
        name,
        slug,
        description: description || null,
        image_url: image_url || null,
        image_alt_text: image_alt_text || null,
        bg_color: bg_color || null,
        show_in_header,
        show_in_footer,
        show_in_home,
        parent_id: parent_id ?? null,
        sort_order,
        is_active,
        meta_info,
      },
      Number(user.id),
    );

    revalidateTag("page-categories", "max");
    if (show_in_header) revalidateTag("site-header", "max");
    if (show_in_footer) revalidateTag("site-footer", "max");
    if (show_in_home) revalidateTag("hero-banner", "max");
    if (parentSlug) revalidateTag(`category-${parentSlug}`, "max");

    revalidatePath("/dashboard/categories");

    await logActivity({
      action: "create_category",
      entity_type: "category",
      entity_id: slug,
      user,
      status: "SUCCESS",
      details: { name, slug },
    });

    return { success: true, message: "Category created successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "create_category",
      entity_type: "category",
      user,
      status: "FAILED",
      details: { name: validatedFields.data.name, error: String(error) },
    });
    return { success: false, message: "Failed to create category." };
  }
}

export async function updateCategory(
  id: number,
  data: CategoryUpdateInput & { image_url?: string | null },
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/categories");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const validatedFields = categoryUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const { image_url } = data;
  const {
    name,
    slug,
    description,
    image_alt_text,
    bg_color,
    show_in_header,
    show_in_footer,
    show_in_home,
    parent_id,
    sort_order,
    is_active,
    meta_info,
  } = validatedFields.data;

  try {
    const { existing, updated, newParentSlug, removedMediaUrls } =
      await updateCategoryTransaction(
        id,
        {
          name,
          slug,
          description: description !== undefined ? description || null : undefined,
          image_url: image_url !== undefined ? image_url || null : undefined,
          image_alt_text:
            image_alt_text !== undefined ? image_alt_text || null : undefined,
          bg_color: bg_color !== undefined ? bg_color || null : undefined,
          show_in_header,
          show_in_footer,
          show_in_home,
          parent_id,
          sort_order,
          is_active,
          meta_info,
        },
        Number(user.id),
      );

    if (removedMediaUrls.length > 0) {
      await bulkDeleteMediaFilesFromStorage(removedMediaUrls);
    }

    const categoryListChanged =
      (name !== undefined && name !== existing.name) ||
      (slug !== undefined && slug !== existing.slug) ||
      (image_url !== undefined && image_url !== existing.image_url) ||
      (bg_color !== undefined && bg_color !== existing.bg_color) ||
      (sort_order !== undefined && sort_order !== existing.sort_order) ||
      (is_active !== undefined && is_active !== existing.is_active);

    if (categoryListChanged) {
      revalidateTag("page-categories", "max");
    }

    if (existing.slug) revalidateTag(`category-${existing.slug}`, "max");
    if (updated.slug && updated.slug !== existing.slug) {
      revalidateTag(`category-${updated.slug}`, "max");
    }

    const headerVisibilityChanged =
      show_in_header !== undefined && show_in_header !== existing.show_in_header;
    const isHeaderRelevant = existing.show_in_header || updated.show_in_header;
    const headerFieldsChanged =
      name !== undefined ||
      slug !== undefined ||
      sort_order !== undefined ||
      parent_id !== undefined ||
      is_active !== undefined;

    if (headerVisibilityChanged || (isHeaderRelevant && headerFieldsChanged)) {
      revalidateTag("site-header", "max");
    }

    const footerVisibilityChanged =
      show_in_footer !== undefined && show_in_footer !== existing.show_in_footer;
    const isFooterRelevant = existing.show_in_footer || updated.show_in_footer;
    const footerFieldsChanged =
      name !== undefined ||
      slug !== undefined ||
      sort_order !== undefined ||
      parent_id !== undefined ||
      is_active !== undefined;

    if (footerVisibilityChanged || (isFooterRelevant && footerFieldsChanged)) {
      revalidateTag("site-footer", "max");
    }

    const homeVisibilityChanged =
      show_in_home !== undefined && show_in_home !== existing.show_in_home;
    const isHomeRelevant = existing.show_in_home || updated.show_in_home;
    const homeFieldsChanged =
      name !== undefined ||
      slug !== undefined ||
      image_url !== undefined ||
      bg_color !== undefined ||
      sort_order !== undefined ||
      is_active !== undefined;

    if (homeVisibilityChanged || (isHomeRelevant && homeFieldsChanged)) {
      revalidateTag("hero-banner", "max");
    }

    if (existing.parent?.slug) {
      revalidateTag(`category-${existing.parent.slug}`, "max");
    }
    if (newParentSlug) {
      revalidateTag(`category-${newParentSlug}`, "max");
    }

    revalidatePath("/dashboard/categories");

    await logActivity({
      action: "update_category",
      entity_type: "category",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, name: validatedFields.data.name, slug: validatedFields.data.slug },
    });

    return { success: true, message: "Category updated successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "update_category",
      entity_type: "category",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to update category." };
  }
}

export async function deleteCategory(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/categories");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const { existing } = await deleteCategoryTransaction(id, Number(user.id));

    revalidateTag("page-categories", "max");
    if (existing.slug) revalidateTag(`category-${existing.slug}`, "max");
    if (existing.show_in_header) revalidateTag("site-header", "max");
    if (existing.show_in_footer) revalidateTag("site-footer", "max");
    if (existing.show_in_home) revalidateTag("hero-banner", "max");
    if (existing.parent?.slug) revalidateTag(`category-${existing.parent.slug}`, "max");

    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/categories/trash");

    await logActivity({
      action: "delete_category",
      entity_type: "category",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, slug: existing.slug },
    });

    return { success: true, message: "Category deleted successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "delete_category",
      entity_type: "category",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to delete category." };
  }
}

export async function restoreCategory(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/categories");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const { existing } = await restoreCategoryTransaction(id, Number(user.id));

    revalidateTag("page-categories", "max");
    if (existing.slug) revalidateTag(`category-${existing.slug}`, "max");
    if (existing.show_in_header) revalidateTag("site-header", "max");
    if (existing.show_in_footer) revalidateTag("site-footer", "max");
    if (existing.show_in_home) revalidateTag("hero-banner", "max");
    if (existing.parent?.slug) revalidateTag(`category-${existing.parent.slug}`, "max");

    revalidatePath("/dashboard/categories/trash");
    revalidatePath("/dashboard/categories");

    await logActivity({
      action: "restore_category",
      entity_type: "category",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, slug: existing.slug },
    });

    return { success: true, message: "Category restored successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "restore_category",
      entity_type: "category",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to restore category." };
  }
}

export async function permanentlyDeleteCategory(
  id: number,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/categories");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const { existing, removedMediaUrls } =
      await permanentlyDeleteCategoryTransaction(id);

    if (removedMediaUrls.length > 0) {
      await bulkDeleteMediaFilesFromStorage(removedMediaUrls);
    }

    revalidateTag("page-categories", "max");
    if (existing.slug) revalidateTag(`category-${existing.slug}`, "max");
    if (existing.show_in_header) revalidateTag("site-header", "max");
    if (existing.show_in_footer) revalidateTag("site-footer", "max");
    if (existing.show_in_home) revalidateTag("hero-banner", "max");
    if (existing.parent?.slug) revalidateTag(`category-${existing.parent.slug}`, "max");

    revalidatePath("/dashboard/categories/trash");

    await logActivity({
      action: "permanently_delete_category",
      entity_type: "category",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, slug: existing.slug },
    });

    return { success: true, message: "Category permanently deleted." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "permanently_delete_category",
      entity_type: "category",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to permanently delete category." };
  }
}

export async function bulkDeleteCategories(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: CategoryFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/categories");
  const filterWhere =
    selectAllScope && filterParams
      ? await getCategoryFilterWhere(filterParams, false)
      : undefined;

  try {
    const { affected } = await bulkDeleteCategoriesTransaction(
      ids,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );

    revalidateTag("page-categories", "max");
    for (const cat of affected) {
      if (cat.slug) revalidateTag(`category-${cat.slug}`, "max");
      if (cat.parent?.slug) revalidateTag(`category-${cat.parent.slug}`, "max");
    }
    if (affected.some((c) => c.show_in_header)) revalidateTag("site-header", "max");
    if (affected.some((c) => c.show_in_footer)) revalidateTag("site-footer", "max");
    if (affected.some((c) => c.show_in_home)) revalidateTag("hero-banner", "max");

    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/categories/trash");

    await logActivity({
      action: "bulk_delete_categories",
      entity_type: "category",
      user,
      status: "SUCCESS",
      details: { ids, count: affected.length },
    });

    return { success: true, message: "Selected categories moved to trash." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "bulk_delete_categories",
      entity_type: "category",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return { success: false, message: "Failed to delete selected categories." };
  }
}

export async function bulkRestoreCategories(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: CategoryFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/categories");
  const filterWhere =
    selectAllScope && filterParams
      ? await getCategoryFilterWhere(filterParams, true)
      : undefined;

  try {
    const { affected } = await bulkRestoreCategoriesTransaction(
      ids,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );

    revalidateTag("page-categories", "max");
    for (const cat of affected) {
      if (cat.slug) revalidateTag(`category-${cat.slug}`, "max");
      if (cat.parent?.slug) revalidateTag(`category-${cat.parent.slug}`, "max");
    }
    if (affected.some((c) => c.show_in_header)) revalidateTag("site-header", "max");
    if (affected.some((c) => c.show_in_footer)) revalidateTag("site-footer", "max");
    if (affected.some((c) => c.show_in_home)) revalidateTag("hero-banner", "max");

    revalidatePath("/dashboard/categories/trash");
    revalidatePath("/dashboard/categories");

    await logActivity({
      action: "bulk_restore_categories",
      entity_type: "category",
      user,
      status: "SUCCESS",
      details: { ids, count: affected.length },
    });

    return { success: true, message: "Selected categories restored." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "bulk_restore_categories",
      entity_type: "category",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return { success: false, message: "Failed to restore selected categories." };
  }
}

export async function bulkPermanentlyDeleteCategories(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: CategoryFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/categories");
  const filterWhere =
    selectAllScope && filterParams
      ? await getCategoryFilterWhere(filterParams, true)
      : undefined;

  try {
    const { affected, removedMediaUrls } =
      await bulkPermanentlyDeleteCategoriesTransaction(
        ids,
        selectAllScope,
        filterWhere,
      );

    if (removedMediaUrls.length > 0) {
      await bulkDeleteMediaFilesFromStorage(removedMediaUrls);
    }

    revalidateTag("page-categories", "max");
    for (const cat of affected) {
      if (cat.slug) revalidateTag(`category-${cat.slug}`, "max");
      if (cat.parent?.slug) revalidateTag(`category-${cat.parent.slug}`, "max");
    }
    if (affected.some((c) => c.show_in_header)) revalidateTag("site-header", "max");
    if (affected.some((c) => c.show_in_footer)) revalidateTag("site-footer", "max");
    if (affected.some((c) => c.show_in_home)) revalidateTag("hero-banner", "max");

    revalidatePath("/dashboard/categories/trash");

    await logActivity({
      action: "bulk_permanently_delete_categories",
      entity_type: "category",
      user,
      status: "SUCCESS",
      details: { ids, count: affected.length },
    });

    return { success: true, message: "Selected categories permanently deleted." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "bulk_permanently_delete_categories",
      entity_type: "category",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return {
      success: false,
      message: "Failed to permanently delete selected categories.",
    };
  }
}
