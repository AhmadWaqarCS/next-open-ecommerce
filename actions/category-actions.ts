"use server";

import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  CategoryCreateInput,
  CategoryUpdateInput,
  categoryCreateSchema,
  categoryUpdateSchema,
} from "@/lib/validations";
import {
  createCategoryInDB,
  deleteCategoryPermanentlyInDB,
  updateCategoryInDB,
  bulkUpdateCategoriesInDB,
  bulkDeleteCategoriesPermanentlyInDB,
} from "@/services/category-services";
import { saveFileToUploads } from "@/services/upload-services";
import { revalidatePath, revalidateTag } from "next/cache";
import { CategoryFilterParams, getCategoryFilterWhere } from "@/lib/filters/category-filters";

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
      message: "Unsupported file type. Please upload a JPEG, PNG, WebP, GIF, SVG, or AVIF image.",
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

    return {
      success: true,
      message: "Image uploaded successfully.",
      data: { relativePath: uploadResult.relativePath },
    };
  } catch (error) {
    console.error("Error uploading category image:", error);
    return { success: false, message: "Failed to save uploaded image." };
  }
}

export async function createCategory(
  data: CategoryCreateInput,
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

  const {
    name,
    slug,
    description,
    image_url,
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
    await createCategoryInDB({
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
      created_by: Number(user.id),
      updated_by: Number(user.id),
    });

    // Revalidate storefront cache tags
    revalidateTag("categories", "max");
    revalidateTag("shop-categories", "max");

    // Revalidate admin dashboard page
    revalidatePath("/dashboard/categories");

    return { success: true, message: "Category created successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to create category." };
  }
}

export async function updateCategory(
  id: number,
  data: CategoryUpdateInput,
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

  const {
    name,
    slug,
    description,
    image_url,
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
    const result = await updateCategoryInDB(id, {
      name,
      slug,
      description: description !== undefined ? description || null : undefined,
      image_url: image_url !== undefined ? image_url || null : undefined,
      image_alt_text: image_alt_text !== undefined ? image_alt_text || null : undefined,
      bg_color: bg_color !== undefined ? bg_color || null : undefined,
      show_in_header,
      show_in_footer,
      show_in_home,
      parent_id,
      sort_order,
      is_active,
      meta_info,
      updated_by: Number(user.id),
    });

    // Revalidate storefront cache tags
    revalidateTag("categories", "max");
    revalidateTag("shop-categories", "max");
    revalidateTag(`category-${result.slug}`, "max");
    if (slug && slug !== result.slug) {
      revalidateTag(`category-${slug}`, "max");
    }

    // Revalidate admin dashboard page
    revalidatePath("/dashboard/categories");

    return { success: true, message: "Category updated successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update category." };
  }
}

export async function deleteCategory(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/categories");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const result = await updateCategoryInDB(id, {
      updated_by: Number(user.id),
      deleted_at: new Date(),
      deleted_by: Number(user.id),
    });

    // Revalidate storefront cache tags
    revalidateTag("categories", "max");
    revalidateTag("shop-categories", "max");
    revalidateTag(`category-${result.slug}`, "max");

    // Revalidate admin dashboard pages
    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/categories/trash");

    return { success: true, message: "Category deleted successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to delete category." };
  }
}

export async function restoreCategory(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/categories");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const result = await updateCategoryInDB(id, {
      updated_by: Number(user.id),
      deleted_at: null,
      deleted_by: null,
    });

    // Revalidate storefront cache tags
    revalidateTag("categories", "max");
    revalidateTag("shop-categories", "max");
    revalidateTag(`category-${result.slug}`, "max");

    // Revalidate admin dashboard pages
    revalidatePath("/dashboard/categories/trash");
    revalidatePath("/dashboard/categories");

    return { success: true, message: "Category restored successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to restore category." };
  }
}

export async function permanentlyDeleteCategory(id: number): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/categories");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const result = await deleteCategoryPermanentlyInDB(id);

    // Revalidate storefront cache tags
    revalidateTag("categories", "max");
    revalidateTag("shop-categories", "max");
    revalidateTag(`category-${result.slug}`, "max");

    // Revalidate admin dashboard page
    revalidatePath("/dashboard/categories/trash");

    return { success: true, message: "Category permanently deleted." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to permanently delete category." };
  }
}

export async function bulkDeleteCategories(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: CategoryFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/categories");
  const filterWhere = selectAllScope && filterParams ? await getCategoryFilterWhere(filterParams, false) : undefined;

  try {
    await bulkUpdateCategoriesInDB(
      ids,
      {
        updated_by: Number(user.id),
        deleted_at: new Date(),
        deleted_by: Number(user.id),
      },
      selectAllScope,
      false,
      filterWhere,
    );

    revalidateTag("categories", "max");
    revalidateTag("shop-categories", "max");
    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/categories/trash");

    return { success: true, message: "Selected categories moved to trash." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to delete selected categories." };
  }
}

export async function bulkRestoreCategories(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: CategoryFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/categories");
  const filterWhere = selectAllScope && filterParams ? await getCategoryFilterWhere(filterParams, true) : undefined;

  try {
    await bulkUpdateCategoriesInDB(
      ids,
      {
        updated_by: Number(user.id),
        deleted_at: null,
        deleted_by: null,
      },
      selectAllScope,
      true,
      filterWhere,
    );

    revalidateTag("categories", "max");
    revalidateTag("shop-categories", "max");
    revalidatePath("/dashboard/categories/trash");
    revalidatePath("/dashboard/categories");

    return { success: true, message: "Selected categories restored." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to restore selected categories." };
  }
}

export async function bulkPermanentlyDeleteCategories(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: CategoryFilterParams,
): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/categories");
  const filterWhere = selectAllScope && filterParams ? await getCategoryFilterWhere(filterParams, true) : undefined;

  try {
    await bulkDeleteCategoriesPermanentlyInDB(ids, selectAllScope, filterWhere);

    revalidateTag("categories", "max");
    revalidateTag("shop-categories", "max");
    revalidatePath("/dashboard/categories/trash");

    return { success: true, message: "Selected categories permanently deleted." };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to permanently delete selected categories.",
    };
  }
}

