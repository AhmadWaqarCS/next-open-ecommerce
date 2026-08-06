"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  ProductCreateInput,
  ProductUpdateInput,
  productCreateSchema,
  productUpdateSchema,
} from "@/lib/validations";
import {
  createProductTransaction,
  updateProductTransaction,
  deleteProductTransaction,
  restoreProductTransaction,
  permanentlyDeleteProductTransaction,
  bulkDeleteProductsTransaction,
  bulkRestoreProductsTransaction,
  bulkPermanentlyDeleteProductsTransaction,
} from "@/services/product-services";
import { bulkDeleteMediaFilesFromStorage } from "@/services/media-services";
import { saveFileToUploads } from "@/services/upload-services";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  ProductFilterParams,
  getProductFilterWhere,
} from "@/lib/filters/product-filters";

export interface ProductGalleryImageInput {
  id?: number;
  url: string;
  alt_text?: string | null;
  sort_order: number;
}

export interface ProductVariantInput {
  id?: number;
  name: string;
  sku?: string | null;
  price?: number | string | null;
  compare_at_price?: number | string | null;
  stock_quantity?: number;
  options?: Record<string, string>;
  image_url?: string | null;
  image_url_alt_text?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export async function uploadProductImage(
  formData: FormData,
): Promise<ActionResponse<{ relativePath: string }>> {
  const { user } = await assertPermission("create", "/dashboard/products");

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
  ];
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      message: "Unsupported file format. Please upload JPG, PNG, WebP, or GIF.",
    };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { success: false, message: "File size exceeds 5MB limit." };
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
    const destination = `products/${year}/${month}`;

    const uploadResult = await saveFileToUploads(buffer, fileName, destination);
    await logActivity({
      action: "upload_product_image",
      entity_type: "product",
      status: "SUCCESS",
      details: { fileName: file.name, relativePath: uploadResult.relativePath },
    });
    return {
      success: true,
      message: "Image uploaded successfully.",
      data: { relativePath: uploadResult.relativePath },
    };
  } catch (error) {
    console.error("Failed to upload image file:", error);
    await logActivity({
      action: "upload_product_image",
      entity_type: "product",
      status: "FAILED",
      details: { fileName: file.name, error: String(error) },
    });
    return { success: false, message: "Failed to upload image file." };
  }
}

export async function createProduct(
  data: ProductCreateInput & {
    feature_image_url?: string | null;
    gallery_images?: ProductGalleryImageInput[];
    variants?: ProductVariantInput[];
  },
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/products");

  if (data.gallery_images && data.gallery_images.length > 10) {
    return {
      success: false,
      message: "Cannot upload more than 10 gallery images per product.",
    };
  }

  const validatedFields = productCreateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const { feature_image_url } = data;
  const {
    name,
    slug,
    description,
    short_description,
    feature_image_alt_text,
    price,
    compare_at_price,
    cost_price,
    sku,
    stock_quantity,
    low_stock_threshold,
    track_inventory,
    weight,
    dimensions,
    category_id,
    is_featured,
    is_active,
    sort_order,
    meta_info,
  } = validatedFields.data;

  try {
    const { categorySlug } = await createProductTransaction(
      {
        name,
        slug,
        description: description || null,
        short_description: short_description || null,
        feature_image_url: feature_image_url || null,
        feature_image_alt_text: feature_image_alt_text || null,
        price,
        compare_at_price: compare_at_price ?? null,
        cost_price: cost_price ?? null,
        sku: sku || null,
        stock_quantity,
        low_stock_threshold,
        track_inventory,
        weight: weight ?? null,
        dimensions: dimensions ?? null,
        category_id: category_id ?? null,
        is_featured,
        is_active,
        sort_order,
        meta_info,
        gallery_images: data.gallery_images,
        variants: data.variants,
      },
      Number(user.id),
    );

    revalidateTag("page-products", "max");
    revalidateTag(`product-${slug}`, "max");
    if (is_featured) revalidateTag("featured-products", "max");
    if (categorySlug) revalidateTag(`category-${categorySlug}`, "max");

    revalidatePath("/dashboard/products");

    await logActivity({
      action: "create_product",
      entity_type: "product",
      entity_id: slug,
      user,
      status: "SUCCESS",
      details: { name, slug, price },
    });

    return { success: true, message: "Product created successfully." };
  } catch (error) {
    console.error("Error creating product:", error);
    await logActivity({
      action: "create_product",
      entity_type: "product",
      user,
      status: "FAILED",
      details: { name, slug, error: String(error) },
    });
    return { success: false, message: "Failed to create product." };
  }
}

export async function updateProduct(
  id: number,
  data: ProductUpdateInput & {
    feature_image_url?: string | null;
    gallery_images?: ProductGalleryImageInput[];
    variants?: ProductVariantInput[];
  },
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/products");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  if (data.gallery_images && data.gallery_images.length > 10) {
    return {
      success: false,
      message: "Cannot upload more than 10 gallery images per product.",
    };
  }

  const validatedFields = productUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const { feature_image_url } = data;
  const {
    name,
    slug,
    description,
    short_description,
    feature_image_alt_text,
    price,
    compare_at_price,
    cost_price,
    sku,
    stock_quantity,
    low_stock_threshold,
    track_inventory,
    weight,
    dimensions,
    category_id,
    is_featured,
    is_active,
    sort_order,
    meta_info,
  } = validatedFields.data;

  try {
    const { existing, updatedProduct, newCategorySlug, removedMediaUrls } =
      await updateProductTransaction(
        id,
        {
          name,
          slug,
          description: description !== undefined ? description || null : undefined,
          short_description:
            short_description !== undefined ? short_description || null : undefined,
          feature_image_url:
            feature_image_url !== undefined ? feature_image_url || null : undefined,
          feature_image_alt_text:
            feature_image_alt_text !== undefined
              ? feature_image_alt_text || null
              : undefined,
          price,
          compare_at_price:
            compare_at_price !== undefined ? (compare_at_price ?? null) : undefined,
          cost_price: cost_price !== undefined ? (cost_price ?? null) : undefined,
          sku: sku !== undefined ? sku || null : undefined,
          stock_quantity,
          low_stock_threshold,
          track_inventory,
          weight: weight !== undefined ? (weight ?? null) : undefined,
          dimensions: dimensions !== undefined ? (dimensions ?? null) : undefined,
          category_id:
            category_id !== undefined ? (category_id ?? null) : undefined,
          is_featured,
          is_active,
          sort_order,
          meta_info,
          gallery_images: data.gallery_images,
          variants: data.variants,
        },
        Number(user.id),
      );

    if (removedMediaUrls.length > 0) {
      await bulkDeleteMediaFilesFromStorage(removedMediaUrls);
    }

    if (existing?.slug) revalidateTag(`product-${existing.slug}`, "max");
    if (updatedProduct.slug && updatedProduct.slug !== existing?.slug) {
      revalidateTag(`product-${updatedProduct.slug}`, "max");
    }

    revalidateTag("page-products", "max");

    const featuredChanged =
      is_featured !== undefined && is_featured !== existing?.is_featured;
    const isFeaturedRelevant = existing?.is_featured || updatedProduct.is_featured;
    if (featuredChanged || isFeaturedRelevant) {
      revalidateTag("featured-products", "max");
    }

    if (existing?.category?.slug) {
      revalidateTag(`category-${existing.category.slug}`, "max");
    }
    if (newCategorySlug) {
      revalidateTag(`category-${newCategorySlug}`, "max");
    }

    revalidatePath("/dashboard/products");

    await logActivity({
      action: "update_product",
      entity_type: "product",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, name: updatedProduct.name, slug: updatedProduct.slug },
    });

    return { success: true, message: "Product updated successfully." };
  } catch (error) {
    console.error("Error updating product:", error);
    await logActivity({
      action: "update_product",
      entity_type: "product",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to update product." };
  }
}

export async function deleteProduct(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/products");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const { existing } = await deleteProductTransaction(id, Number(user.id));

    revalidateTag("page-products", "max");
    if (existing?.slug) revalidateTag(`product-${existing.slug}`, "max");
    if (existing?.is_featured) revalidateTag("featured-products", "max");
    if (existing?.category?.slug)
      revalidateTag(`category-${existing.category.slug}`, "max");

    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/products/trash");

    await logActivity({
      action: "delete_product",
      entity_type: "product",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, slug: existing?.slug },
    });

    return { success: true, message: "Product deleted successfully." };
  } catch (error) {
    console.error("Error deleting product:", error);
    await logActivity({
      action: "delete_product",
      entity_type: "product",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to delete product." };
  }
}

export async function restoreProduct(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/products");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const { existing } = await restoreProductTransaction(id, Number(user.id));

    revalidateTag("page-products", "max");
    if (existing?.slug) revalidateTag(`product-${existing.slug}`, "max");
    if (existing?.is_featured) revalidateTag("featured-products", "max");
    if (existing?.category?.slug)
      revalidateTag(`category-${existing.category.slug}`, "max");

    revalidatePath("/dashboard/products/trash");
    revalidatePath("/dashboard/products");

    await logActivity({
      action: "restore_product",
      entity_type: "product",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, slug: existing?.slug },
    });

    return { success: true, message: "Product restored successfully." };
  } catch (error) {
    console.error("Error restoring product:", error);
    await logActivity({
      action: "restore_product",
      entity_type: "product",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to restore product." };
  }
}

export async function permanentlyDeleteProduct(
  id: number,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/products");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const { existing, removedMediaUrls } =
      await permanentlyDeleteProductTransaction(id);

    if (removedMediaUrls.length > 0) {
      await bulkDeleteMediaFilesFromStorage(removedMediaUrls);
    }

    revalidateTag("page-products", "max");
    if (existing?.slug) revalidateTag(`product-${existing.slug}`, "max");
    if (existing?.is_featured) revalidateTag("featured-products", "max");
    if (existing?.category?.slug)
      revalidateTag(`category-${existing.category.slug}`, "max");

    revalidatePath("/dashboard/products/trash");

    await logActivity({
      action: "permanently_delete_product",
      entity_type: "product",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, slug: existing?.slug },
    });

    return { success: true, message: "Product permanently deleted." };
  } catch (error) {
    console.error("Error permanently deleting product:", error);
    await logActivity({
      action: "permanently_delete_product",
      entity_type: "product",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to permanently delete product." };
  }
}

export async function bulkDeleteProducts(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: ProductFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/products");
  const filterWhere =
    selectAllScope && filterParams
      ? getProductFilterWhere(filterParams, false)
      : undefined;

  try {
    const { affected } = await bulkDeleteProductsTransaction(
      ids,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );

    revalidateTag("page-products", "max");
    for (const prod of affected) {
      if (prod.slug) revalidateTag(`product-${prod.slug}`, "max");
      if (prod.category?.slug)
        revalidateTag(`category-${prod.category.slug}`, "max");
    }
    if (affected.some((p) => p.is_featured))
      revalidateTag("featured-products", "max");

    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/products/trash");

    await logActivity({
      action: "bulk_delete_products",
      entity_type: "product",
      user,
      status: "SUCCESS",
      details: { ids, count: affected.length },
    });

    return { success: true, message: "Selected products moved to trash." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "bulk_delete_products",
      entity_type: "product",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return { success: false, message: "Failed to delete selected products." };
  }
}

export async function bulkRestoreProducts(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: ProductFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/products");
  const filterWhere =
    selectAllScope && filterParams
      ? getProductFilterWhere(filterParams, true)
      : undefined;

  try {
    const { affected } = await bulkRestoreProductsTransaction(
      ids,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );

    revalidateTag("page-products", "max");
    for (const prod of affected) {
      if (prod.slug) revalidateTag(`product-${prod.slug}`, "max");
      if (prod.category?.slug)
        revalidateTag(`category-${prod.category.slug}`, "max");
    }
    if (affected.some((p) => p.is_featured))
      revalidateTag("featured-products", "max");

    revalidatePath("/dashboard/products/trash");
    revalidatePath("/dashboard/products");

    await logActivity({
      action: "bulk_restore_products",
      entity_type: "product",
      user,
      status: "SUCCESS",
      details: { ids, count: affected.length },
    });

    return { success: true, message: "Selected products restored." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "bulk_restore_products",
      entity_type: "product",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return { success: false, message: "Failed to restore selected products." };
  }
}

export async function bulkPermanentlyDeleteProducts(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: ProductFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/products");
  const filterWhere =
    selectAllScope && filterParams
      ? getProductFilterWhere(filterParams, true)
      : undefined;

  try {
    const { affected, removedMediaUrls } =
      await bulkPermanentlyDeleteProductsTransaction(
        ids,
        selectAllScope,
        filterWhere,
      );

    if (removedMediaUrls.length > 0) {
      await bulkDeleteMediaFilesFromStorage(removedMediaUrls);
    }

    revalidateTag("page-products", "max");
    for (const prod of affected) {
      if (prod.slug) revalidateTag(`product-${prod.slug}`, "max");
      if (prod.category?.slug)
        revalidateTag(`category-${prod.category.slug}`, "max");
    }
    if (affected.some((p) => p.is_featured))
      revalidateTag("featured-products", "max");

    revalidatePath("/dashboard/products/trash");

    await logActivity({
      action: "bulk_permanently_delete_products",
      entity_type: "product",
      user,
      status: "SUCCESS",
      details: { ids, count: affected.length },
    });

    return { success: true, message: "Selected products permanently deleted." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "bulk_permanently_delete_products",
      entity_type: "product",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return {
      success: false,
      message: "Failed to permanently delete selected products.",
    };
  }
}
