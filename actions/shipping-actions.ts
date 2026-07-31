"use server";

import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  ShippingMethodCreateInput,
  ShippingMethodUpdateInput,
  shippingMethodCreateSchema,
  shippingMethodUpdateSchema,
} from "@/lib/validations";
import {
  createShippingMethodInDB,
  updateShippingMethodInDB,
  deleteShippingMethodPermanentlyInDB,
  bulkUpdateShippingMethodsInDB,
  bulkDeleteShippingMethodsPermanentlyInDB,
} from "@/services/shipping-services";
import { revalidatePath, revalidateTag } from "next/cache";
import { ShippingFilterParams, getShippingFilterWhere } from "@/lib/filters/shipping-filters";

export async function createShippingMethod(
  data: ShippingMethodCreateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/shipping");

  const validatedFields = shippingMethodCreateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const {
    name,
    description,
    price,
    free_over,
    estimated_days_min,
    estimated_days_max,
    is_active,
    sort_order,
  } = validatedFields.data;

  try {
    await createShippingMethodInDB({
      name,
      description: description || null,
      price,
      free_over: free_over ?? null,
      estimated_days_min: estimated_days_min ?? null,
      estimated_days_max: estimated_days_max ?? null,
      is_active,
      sort_order,
      created_by: Number(user.id),
      updated_by: Number(user.id),
    });

    revalidateTag("shipping-methods", "max");
    revalidateTag("checkout", "max");
    revalidatePath("/dashboard/shipping");

    return { success: true, message: "Shipping method created successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to create shipping method." };
  }
}

export async function updateShippingMethod(
  id: number,
  data: ShippingMethodUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/shipping");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const validatedFields = shippingMethodUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const {
    name,
    description,
    price,
    free_over,
    estimated_days_min,
    estimated_days_max,
    is_active,
    sort_order,
  } = validatedFields.data;

  try {
    await updateShippingMethodInDB(id, {
      name,
      description: description !== undefined ? description || null : undefined,
      price,
      free_over: free_over !== undefined ? free_over ?? null : undefined,
      estimated_days_min: estimated_days_min !== undefined ? estimated_days_min ?? null : undefined,
      estimated_days_max: estimated_days_max !== undefined ? estimated_days_max ?? null : undefined,
      is_active,
      sort_order,
      updated_by: Number(user.id),
    });

    revalidateTag("shipping-methods", "max");
    revalidateTag("checkout", "max");
    revalidatePath("/dashboard/shipping");

    return { success: true, message: "Shipping method updated successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update shipping method." };
  }
}

export async function deleteShippingMethod(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/shipping");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await updateShippingMethodInDB(id, {
      updated_by: Number(user.id),
      deleted_at: new Date(),
      deleted_by: Number(user.id),
    });

    revalidateTag("shipping-methods", { expire: 0 });
    revalidatePath("/dashboard/shipping");
    revalidatePath("/dashboard/shipping/trash");

    return { success: true, message: "Shipping method deleted successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to delete shipping method." };
  }
}

export async function restoreShippingMethod(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/shipping");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await updateShippingMethodInDB(id, {
      updated_by: Number(user.id),
      deleted_at: null,
      deleted_by: null,
    });

    revalidateTag("shipping-methods", "max");
    revalidatePath("/dashboard/shipping/trash");
    revalidatePath("/dashboard/shipping");

    return { success: true, message: "Shipping method restored successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to restore shipping method." };
  }
}

export async function permanentlyDeleteShippingMethod(id: number): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/shipping");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await deleteShippingMethodPermanentlyInDB(id);

    revalidateTag("shipping-methods", { expire: 0 });
    revalidatePath("/dashboard/shipping/trash");

    return { success: true, message: "Shipping method permanently deleted." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to permanently delete shipping method." };
  }
}

export async function bulkDeleteShippingMethods(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: ShippingFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/shipping");
  const filterWhere = selectAllScope && filterParams ? await getShippingFilterWhere(filterParams, false) : undefined;

  try {
    await bulkUpdateShippingMethodsInDB(
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

    revalidateTag("shipping-methods", { expire: 0 });
    revalidatePath("/dashboard/shipping");
    revalidatePath("/dashboard/shipping/trash");

    return { success: true, message: "Selected shipping methods moved to trash." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to delete selected shipping methods." };
  }
}

export async function bulkRestoreShippingMethods(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: ShippingFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/shipping");
  const filterWhere = selectAllScope && filterParams ? await getShippingFilterWhere(filterParams, true) : undefined;

  try {
    await bulkUpdateShippingMethodsInDB(
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

    revalidateTag("shipping-methods", "max");
    revalidatePath("/dashboard/shipping/trash");
    revalidatePath("/dashboard/shipping");

    return { success: true, message: "Selected shipping methods restored." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to restore selected shipping methods." };
  }
}

export async function bulkPermanentlyDeleteShippingMethods(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: ShippingFilterParams,
): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/shipping");
  const filterWhere = selectAllScope && filterParams ? await getShippingFilterWhere(filterParams, true) : undefined;

  try {
    await bulkDeleteShippingMethodsPermanentlyInDB(ids, selectAllScope, filterWhere);

    revalidateTag("shipping-methods", { expire: 0 });
    revalidatePath("/dashboard/shipping/trash");

    return { success: true, message: "Selected shipping methods permanently deleted." };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to permanently delete selected shipping methods.",
    };
  }
}
