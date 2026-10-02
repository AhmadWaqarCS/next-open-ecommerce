"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  CategoryCreateInput,
  CategoryUpdateInput,
  categoryCreateSchema,
  categoryUpdateSchema,
  categoryStatusToggleSchema,
} from "@/lib/validations";
import {
  createCategoryTransaction,
  updateCategoryTransaction,
  toggleCategoryStatusTransaction,
  deleteCategoryTransaction,
  restoreCategoryTransaction,
  permanentlyDeleteCategoryTransaction,
  bulkDeleteCategoriesTransaction,
  bulkRestoreCategoriesTransaction,
  bulkPermanentlyDeleteCategoriesTransaction,
} from "@/services/category-services";
import { saveMediaToStorage } from "@/services/storage-services";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  CategoryFilterParams,
  getCategoryFilterWhere,
} from "@/lib/filters/category-filters";

export async function uploadCategoryImage(
  formData: FormData,
): Promise<ActionResponse<{ relativePath: string }>> {
  // Authorize if user has either 'create' or 'update' permission on categories
  let user;
  try {
    const auth = await assertPermission("create", "/dashboard/categories");
    user = auth.user;
  } catch {
    const auth = await assertPermission("update", "/dashboard/categories");
    user = auth.user;
  }

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

    const uploadResult = await saveMediaToStorage(buffer, fileName, destination);
    if (!uploadResult) {
      return { success: false, message: "Failed to save uploaded image." };
    }

    await logActivity({
      action: "upload_category_image",
      entity_type: "category",
      user,
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
    if (show_in_home) revalidateTag("home-page", "max");
    revalidateTag(`category-${slug}`, "max");
    if (parentSlug) revalidateTag(`category-${parentSlug}`, "max");

    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/categories/trash");

    await logActivity({
      action: "create_category",
      entity_type: "category",
      entity_id: slug,
      user,
      status: "SUCCESS",
      details: { name, slug },
    });

    return { success: true, message: "Category created successfully." };
  } catch (error: any) {
    console.error("Error creating category:", error);

    if (error.message === "CATEGORY_SLUG_EXISTS") {
      return {
        success: false,
        errors: { slug: "A category with this slug already exists." },
        message: "A category with this slug already exists.",
      };
    }
    if (error.message === "CATEGORY_PARENT_NOT_FOUND") {
      return {
        success: false,
        errors: { parent_id: "Selected parent category does not exist or has been deleted." },
        message: "Selected parent category does not exist.",
      };
    }

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

  if (id < 1) return { success: false, message: "Invalid category ID." };

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
    const { existing, updated, newParentSlug } =
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

    revalidateTag("page-categories", "max");
    revalidateTag("site-header", "max");
    revalidateTag("site-footer", "max");
    revalidateTag("home-page", "max");
    if (existing.slug) revalidateTag(`category-${existing.slug}`, "max");
    if (updated.slug && updated.slug !== existing.slug) {
      revalidateTag(`category-${updated.slug}`, "max");
    }
    if (existing.parent?.slug) {
      revalidateTag(`category-${existing.parent.slug}`, "max");
    }
    if (newParentSlug) {
      revalidateTag(`category-${newParentSlug}`, "max");
    }

    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/categories/trash");

    await logActivity({
      action: "update_category",
      entity_type: "category",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, name: validatedFields.data.name, slug: validatedFields.data.slug },
    });

    return { success: true, message: "Category updated successfully." };
  } catch (error: any) {
    console.error("Error updating category:", error);

    if (error.message === "CATEGORY_SLUG_EXISTS") {
      return {
        success: false,
        errors: { slug: "A category with this slug already exists." },
        message: "A category with this slug already exists.",
      };
    }
    if (error.message === "CATEGORY_SELF_PARENT") {
      return {
        success: false,
        errors: { parent_id: "A category cannot be set as its own parent." },
        message: "A category cannot be its own parent.",
      };
    }
    if (error.message === "CATEGORY_PARENT_NOT_FOUND") {
      return {
        success: false,
        errors: { parent_id: "Selected parent category does not exist or has been deleted." },
        message: "Selected parent category does not exist.",
      };
    }
    if (error.message === "CATEGORY_CIRCULAR_HIERARCHY") {
      return {
        success: false,
        errors: { parent_id: "Cannot select a subcategory as parent (circular hierarchy detected)." },
        message: "Circular category hierarchy detected.",
      };
    }

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

export async function toggleCategoryStatus(
  id: number,
  is_active: boolean,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/categories");

  const parsed = categoryStatusToggleSchema.safeParse({ id, is_active });
  if (!parsed.success) {
    return {
      success: false,
      errors: formatZodErrors(parsed.error),
      message: "Invalid parameters for status toggle.",
    };
  }

  try {
    const { existing, updated } = await toggleCategoryStatusTransaction(
      id,
      is_active,
      Number(user.id),
    );

    revalidateTag("page-categories", "max");
    revalidateTag("site-header", "max");
    revalidateTag("site-footer", "max");
    revalidateTag("home-page", "max");
    if (existing.slug) revalidateTag(`category-${existing.slug}`, "max");
    if (existing.parent?.slug) revalidateTag(`category-${existing.parent.slug}`, "max");

    revalidatePath("/dashboard/categories");

    await logActivity({
      action: "toggle_category_status",
      entity_type: "category",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, slug: existing.slug, is_active: updated.is_active },
    });

    return {
      success: true,
      message: `Category "${existing.name}" is now ${is_active ? "Active" : "Inactive"}.`,
    };
  } catch (error) {
    console.error("Error toggling category status:", error);
    await logActivity({
      action: "toggle_category_status",
      entity_type: "category",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to toggle category status." };
  }
}

export async function deleteCategory(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/categories");

  if (id < 1) return { success: false, message: "Invalid category ID." };

  try {
    const { existing } = await deleteCategoryTransaction(id, Number(user.id));

    revalidateTag("page-categories", "max");
    if (existing.slug) revalidateTag(`category-${existing.slug}`, "max");
    if (existing.show_in_header) revalidateTag("site-header", "max");
    if (existing.show_in_footer) revalidateTag("site-footer", "max");
    if (existing.show_in_home) revalidateTag("home-page", "max");
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

    return { success: true, message: `Category "${existing.name}" moved to trash.` };
  } catch (error) {
    console.error("Error deleting category:", error);
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

  if (id < 1) return { success: false, message: "Invalid category ID." };

  try {
    const { existing } = await restoreCategoryTransaction(id, Number(user.id));

    revalidateTag("page-categories", "max");
    if (existing.slug) revalidateTag(`category-${existing.slug}`, "max");
    if (existing.show_in_header) revalidateTag("site-header", "max");
    if (existing.show_in_footer) revalidateTag("site-footer", "max");
    if (existing.show_in_home) revalidateTag("home-page", "max");
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

    return { success: true, message: `Category "${existing.name}" restored successfully.` };
  } catch (error) {
    console.error("Error restoring category:", error);
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

  if (id < 1) return { success: false, message: "Invalid category ID." };

  try {
    const { existing } = await permanentlyDeleteCategoryTransaction(id);

    revalidateTag("page-categories", "max");
    if (existing.slug) revalidateTag(`category-${existing.slug}`, "max");
    if (existing.show_in_header) revalidateTag("site-header", "max");
    if (existing.show_in_footer) revalidateTag("site-footer", "max");
    if (existing.show_in_home) revalidateTag("home-page", "max");
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

    return { success: true, message: `Category "${existing.name}" permanently deleted.` };
  } catch (error: any) {
    console.error("Error permanently deleting category:", error);

    if (error.message?.startsWith("CATEGORY_HAS_CHILDREN:")) {
      const count = error.message.split(":")[1];
      return {
        success: false,
        message: `Cannot permanently delete this category because it has ${count} subcategor${Number(count) === 1 ? "y" : "ies"}. Please reassign or delete the subcategories first.`,
      };
    }
    if (error.message?.startsWith("CATEGORY_HAS_PRODUCTS:")) {
      const count = error.message.split(":")[1];
      return {
        success: false,
        message: `Cannot permanently delete this category because ${count} product(s) are assigned to it. Please reassign those products first.`,
      };
    }

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
    if (affected.some((c) => c.show_in_home)) revalidateTag("home-page", "max");

    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/categories/trash");

    await logActivity({
      action: "bulk_delete_categories",
      entity_type: "category",
      user,
      status: "SUCCESS",
      details: { ids, count: affected.length },
    });

    return { success: true, message: `${affected.length} category/categories moved to trash.` };
  } catch (error) {
    console.error("Error in bulkDeleteCategories:", error);
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
    if (affected.some((c) => c.show_in_home)) revalidateTag("home-page", "max");

    revalidatePath("/dashboard/categories/trash");
    revalidatePath("/dashboard/categories");

    await logActivity({
      action: "bulk_restore_categories",
      entity_type: "category",
      user,
      status: "SUCCESS",
      details: { ids, count: affected.length },
    });

    return { success: true, message: `${affected.length} category/categories restored from trash.` };
  } catch (error) {
    console.error("Error in bulkRestoreCategories:", error);
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
    const { affected, skippedCount } =
      await bulkPermanentlyDeleteCategoriesTransaction(
        ids,
        selectAllScope,
        filterWhere,
      );

    revalidateTag("page-categories", "max");
    for (const cat of affected) {
      if (cat.slug) revalidateTag(`category-${cat.slug}`, "max");
      if (cat.parent?.slug) revalidateTag(`category-${cat.parent.slug}`, "max");
    }
    if (affected.some((c) => c.show_in_header)) revalidateTag("site-header", "max");
    if (affected.some((c) => c.show_in_footer)) revalidateTag("site-footer", "max");
    if (affected.some((c) => c.show_in_home)) revalidateTag("home-page", "max");

    revalidatePath("/dashboard/categories/trash");

    await logActivity({
      action: "bulk_permanently_delete_categories",
      entity_type: "category",
      user,
      status: "SUCCESS",
      details: { ids, deletedCount: affected.length, skippedCount },
    });

    let message = `${affected.length} category/categories permanently deleted.`;
    if (skippedCount > 0) {
      message += ` ${skippedCount} categories were skipped because they have subcategories or assigned products.`;
    }

    return { success: true, message };
  } catch (error) {
    console.error("Error in bulkPermanentlyDeleteCategories:", error);
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
