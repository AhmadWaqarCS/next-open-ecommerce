"use server";

import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  ProductImageCreateInput,
  ProductImageUpdateInput,
  productImageCreateSchema,
  productImageUpdateSchema,
} from "@/lib/validations";
import {
  createProductImageInDB,
  deleteProductImagePermanentlyInDB,
  updateProductImageInDB,
} from "@/services/product-image-services";
import { revalidatePath } from "next/cache";

export async function createProductImage(
  data: ProductImageCreateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/products");

  const validatedFields = productImageCreateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const { product_id, url, alt_text, sort_order } = validatedFields.data;

  try {
    await createProductImageInDB({
      product_id,
      url,
      alt_text: alt_text || null,
      sort_order,
      created_by: Number(user.id),
      updated_by: Number(user.id),
    });
    revalidatePath(`/dashboard/products`);
    return { success: true, message: "Image added successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to add image." };
  }
}

export async function updateProductImage(
  id: number,
  data: ProductImageUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/products");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const validatedFields = productImageUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const { url, alt_text, sort_order } = validatedFields.data;

  try {
    await updateProductImageInDB(id, {
      url,
      alt_text,
      sort_order,
      updated_by: Number(user.id),
    });
    revalidatePath("/dashboard/products");
    return { success: true, message: "Image updated successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to update image." };
  }
}

export async function deleteProductImage(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/products");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await updateProductImageInDB(id, {
      updated_by: Number(user.id),
      deleted_at: new Date(),
      deleted_by: Number(user.id),
    });
    revalidatePath("/dashboard/products");
    return { success: true, message: "Image deleted successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to delete image." };
  }
}

export async function restoreProductImage(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/products");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await updateProductImageInDB(id, {
      updated_by: Number(user.id),
      deleted_at: null,
      deleted_by: null,
    });
    revalidatePath("/dashboard/products");
    return { success: true, message: "Image restored successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to restore image." };
  }
}

export async function permanentlyDeleteProductImage(id: number): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/products");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await deleteProductImagePermanentlyInDB(id);
    revalidatePath("/dashboard/products");
    return { success: true, message: "Image permanently deleted." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to permanently delete image." };
  }
}
