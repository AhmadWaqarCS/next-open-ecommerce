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
  createProductVariantInDB,
  deleteProductVariantPermanentlyInDB,
  updateProductVariantInDB,
} from "@/services/product-variant-services";
import { revalidatePath } from "next/cache";

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

  const { product_id, name, sku, price, compare_at_price, stock_quantity,
    options, image_url, image_url_alt_text, is_active, sort_order } = validatedFields.data;

  try {
    await createProductVariantInDB({
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
      created_by: Number(user.id),
      updated_by: Number(user.id),
    });
    revalidatePath("/dashboard/products");
    return { success: true, message: "Variant created successfully." };
  } catch (error) {
    console.log(error);
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

  const { name, sku, price, compare_at_price, stock_quantity,
    options, image_url, image_url_alt_text, is_active, sort_order } = validatedFields.data;

  try {
    await updateProductVariantInDB(id, {
      name,
      sku: sku !== undefined ? sku || null : undefined,
      price: price !== undefined ? price ?? null : undefined,
      compare_at_price: compare_at_price !== undefined ? compare_at_price ?? null : undefined,
      stock_quantity,
      options,
      image_url: image_url !== undefined ? image_url || null : undefined,
      image_url_alt_text: image_url_alt_text !== undefined ? image_url_alt_text || null : undefined,
      is_active,
      sort_order,
      updated_by: Number(user.id),
    });
    revalidatePath("/dashboard/products");
    return { success: true, message: "Variant updated successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to update variant." };
  }
}

export async function deleteProductVariant(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/products");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await updateProductVariantInDB(id, {
      updated_by: Number(user.id),
      deleted_at: new Date(),
      deleted_by: Number(user.id),
    });
    revalidatePath("/dashboard/products");
    return { success: true, message: "Variant deleted successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to delete variant." };
  }
}

export async function restoreProductVariant(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/products");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await updateProductVariantInDB(id, {
      updated_by: Number(user.id),
      deleted_at: null,
      deleted_by: null,
    });
    revalidatePath("/dashboard/products");
    return { success: true, message: "Variant restored successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to restore variant." };
  }
}

export async function permanentlyDeleteProductVariant(id: number): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/products");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await deleteProductVariantPermanentlyInDB(id);
    revalidatePath("/dashboard/products");
    return { success: true, message: "Variant permanently deleted." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to permanently delete variant." };
  }
}
