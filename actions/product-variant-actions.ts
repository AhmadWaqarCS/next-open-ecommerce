"use server";

import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  ProductVariantCreateInput,
  ProductVariantUpdateInput,
  productVariantCreateSchema,
  productVariantUpdateSchema,
} from "@/lib/validations";
import {
  createProductVariantTransaction,
  updateProductVariantTransaction,
  deleteProductVariantTransaction,
  restoreProductVariantTransaction,
  permanentlyDeleteProductVariantTransaction,
} from "@/services/product-variant-services";
import { bulkDeleteMediaFilesFromStorage } from "@/services/media-services";
import { revalidatePath, revalidateTag } from "next/cache";

export async function createProductVariant(
  data: ProductVariantCreateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/products");

  const validatedFields = productVariantCreateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const {
    product_id,
    name,
    sku,
    price,
    compare_at_price,
    stock_quantity,
    options,
    image_url,
    image_url_alt_text,
    is_active,
    sort_order,
  } = validatedFields.data;

  try {
    const newVariant = await createProductVariantTransaction(
      {
        product_id,
        name,
        sku: sku || null,
        price: price ?? null,
        compare_at_price: compare_at_price ?? null,
        stock_quantity,
        options,
        image_url: image_url || null,
        image_url_alt_text: image_url_alt_text || null,
        is_active,
        sort_order,
      },
      Number(user.id),
    );

    if (newVariant.product?.slug) {
      revalidateTag(`product-${newVariant.product.slug}`, "max");
    }

    revalidatePath("/dashboard/products");
    return { success: true, message: "Variant created successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to create variant." };
  }
}

export async function updateProductVariant(
  id: number,
  data: ProductVariantUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/products");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const validatedFields = productVariantUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const {
    name,
    sku,
    price,
    compare_at_price,
    stock_quantity,
    options,
    image_url,
    image_url_alt_text,
    is_active,
    sort_order,
  } = validatedFields.data;

  try {
    const { existing, removedMediaUrl } = await updateProductVariantTransaction(
      id,
      {
        name,
        sku: sku !== undefined ? sku || null : undefined,
        price: price !== undefined ? price ?? null : undefined,
        compare_at_price:
          compare_at_price !== undefined ? compare_at_price ?? null : undefined,
        stock_quantity,
        options,
        image_url: image_url !== undefined ? image_url || null : undefined,
        image_url_alt_text:
          image_url_alt_text !== undefined ? image_url_alt_text || null : undefined,
        is_active,
        sort_order,
      },
      Number(user.id),
    );

    if (removedMediaUrl) {
      await bulkDeleteMediaFilesFromStorage([removedMediaUrl]);
    }

    if (existing?.product?.slug) {
      revalidateTag(`product-${existing.product.slug}`, "max");
    }

    revalidatePath("/dashboard/products");
    return { success: true, message: "Variant updated successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update variant." };
  }
}

export async function deleteProductVariant(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/products");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const { existing } = await deleteProductVariantTransaction(id, Number(user.id));

    if (existing?.product?.slug) {
      revalidateTag(`product-${existing.product.slug}`, "max");
    }

    revalidatePath("/dashboard/products");
    return { success: true, message: "Variant deleted successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to delete variant." };
  }
}

export async function restoreProductVariant(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/products");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const { existing } = await restoreProductVariantTransaction(id, Number(user.id));

    if (existing?.product?.slug) {
      revalidateTag(`product-${existing.product.slug}`, "max");
    }

    revalidatePath("/dashboard/products");
    return { success: true, message: "Variant restored successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to restore variant." };
  }
}

export async function permanentlyDeleteProductVariant(
  id: number,
): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/products");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const { existing, removedMediaUrl } =
      await permanentlyDeleteProductVariantTransaction(id);

    if (removedMediaUrl) {
      await bulkDeleteMediaFilesFromStorage([removedMediaUrl]);
    }

    if (existing?.product?.slug) {
      revalidateTag(`product-${existing.product.slug}`, "max");
    }

    revalidatePath("/dashboard/products");
    return { success: true, message: "Variant permanently deleted." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to permanently delete variant." };
  }
}
