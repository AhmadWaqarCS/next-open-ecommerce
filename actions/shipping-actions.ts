"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  ShippingMethodCreateInput,
  ShippingMethodUpdateInput,
  shippingMethodCreateSchema,
  shippingMethodUpdateSchema,
} from "@/lib/validations";
import {
  createShippingMethodTransaction,
  updateShippingMethodTransaction,
  deleteShippingMethodTransaction,
  restoreShippingMethodTransaction,
  permanentlyDeleteShippingMethodTransaction,
  bulkDeleteShippingMethodsTransaction,
  bulkRestoreShippingMethodsTransaction,
  bulkPermanentlyDeleteShippingMethodsTransaction,
} from "@/services/shipping-services";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  ShippingFilterParams,
  getShippingFilterWhere,
} from "@/lib/filters/shipping-filters";

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
    await createShippingMethodTransaction(
      {
        name,
        description: description || null,
        price,
        free_over: free_over ?? null,
        estimated_days_min: estimated_days_min ?? null,
        estimated_days_max: estimated_days_max ?? null,
        is_active,
        sort_order,
      },
      Number(user.id),
    );

    revalidateTag("site-footer", "max");
    revalidatePath("/dashboard/shipping");

    await logActivity({
      action: "create_shipping_method",
      entity_type: "shipping_method",
      entity_id: name,
      user,
      status: "SUCCESS",
      details: { name, price },
    });

    return { success: true, message: "Shipping method created successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "create_shipping_method",
      entity_type: "shipping_method",
      user,
      status: "FAILED",
      details: { name, error: String(error) },
    });
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
    await updateShippingMethodTransaction(
      id,
      {
        name,
        description: description !== undefined ? description || null : undefined,
        price,
        free_over: free_over !== undefined ? free_over ?? null : undefined,
        estimated_days_min:
          estimated_days_min !== undefined ? estimated_days_min ?? null : undefined,
        estimated_days_max:
          estimated_days_max !== undefined ? estimated_days_max ?? null : undefined,
        is_active,
        sort_order,
      },
      Number(user.id),
    );

    revalidateTag("site-footer", "max");
    revalidatePath("/dashboard/shipping");

    await logActivity({
      action: "update_shipping_method",
      entity_type: "shipping_method",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, name },
    });

    return { success: true, message: "Shipping method updated successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "update_shipping_method",
      entity_type: "shipping_method",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to update shipping method." };
  }
}

export async function deleteShippingMethod(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/shipping");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await deleteShippingMethodTransaction(id, Number(user.id));

    revalidateTag("site-footer", "max");
    revalidatePath("/dashboard/shipping");
    revalidatePath("/dashboard/shipping/trash");

    await logActivity({
      action: "delete_shipping_method",
      entity_type: "shipping_method",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return { success: true, message: "Shipping method deleted successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "delete_shipping_method",
      entity_type: "shipping_method",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to delete shipping method." };
  }
}

export async function restoreShippingMethod(
  id: number,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/shipping");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await restoreShippingMethodTransaction(id, Number(user.id));

    revalidateTag("site-footer", "max");
    revalidatePath("/dashboard/shipping/trash");
    revalidatePath("/dashboard/shipping");

    await logActivity({
      action: "restore_shipping_method",
      entity_type: "shipping_method",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return { success: true, message: "Shipping method restored successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "restore_shipping_method",
      entity_type: "shipping_method",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to restore shipping method." };
  }
}

export async function permanentlyDeleteShippingMethod(
  id: number,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/shipping");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await permanentlyDeleteShippingMethodTransaction(id);

    revalidateTag("site-footer", "max");
    revalidatePath("/dashboard/shipping/trash");

    await logActivity({
      action: "permanently_delete_shipping_method",
      entity_type: "shipping_method",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return { success: true, message: "Shipping method permanently deleted." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "permanently_delete_shipping_method",
      entity_type: "shipping_method",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return {
      success: false,
      message: "Failed to permanently delete shipping method.",
    };
  }
}

export async function bulkDeleteShippingMethods(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: ShippingFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/shipping");
  const filterWhere =
    selectAllScope && filterParams
      ? await getShippingFilterWhere(filterParams, false)
      : undefined;

  try {
    await bulkDeleteShippingMethodsTransaction(
      ids,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );

    revalidateTag("site-footer", "max");
    revalidatePath("/dashboard/shipping");
    revalidatePath("/dashboard/shipping/trash");

    await logActivity({
      action: "bulk_delete_shipping_methods",
      entity_type: "shipping_method",
      user,
      status: "SUCCESS",
      details: { ids },
    });

    return { success: true, message: "Selected shipping methods moved to trash." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "bulk_delete_shipping_methods",
      entity_type: "shipping_method",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return {
      success: false,
      message: "Failed to delete selected shipping methods.",
    };
  }
}

export async function bulkRestoreShippingMethods(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: ShippingFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/shipping");
  const filterWhere =
    selectAllScope && filterParams
      ? await getShippingFilterWhere(filterParams, true)
      : undefined;

  try {
    await bulkRestoreShippingMethodsTransaction(
      ids,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );

    revalidateTag("site-footer", "max");
    revalidatePath("/dashboard/shipping/trash");
    revalidatePath("/dashboard/shipping");

    await logActivity({
      action: "bulk_restore_shipping_methods",
      entity_type: "shipping_method",
      user,
      status: "SUCCESS",
      details: { ids },
    });

    return { success: true, message: "Selected shipping methods restored." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "bulk_restore_shipping_methods",
      entity_type: "shipping_method",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return {
      success: false,
      message: "Failed to restore selected shipping methods.",
    };
  }
}

export async function bulkPermanentlyDeleteShippingMethods(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: ShippingFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/shipping");
  const filterWhere =
    selectAllScope && filterParams
      ? await getShippingFilterWhere(filterParams, true)
      : undefined;

  try {
    await bulkPermanentlyDeleteShippingMethodsTransaction(
      ids,
      selectAllScope,
      filterWhere,
    );

    revalidateTag("site-footer", "max");
    revalidatePath("/dashboard/shipping/trash");

    await logActivity({
      action: "bulk_permanently_delete_shipping_methods",
      entity_type: "shipping_method",
      user,
      status: "SUCCESS",
      details: { ids },
    });

    return {
      success: true,
      message: "Selected shipping methods permanently deleted.",
    };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "bulk_permanently_delete_shipping_methods",
      entity_type: "shipping_method",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return {
      success: false,
      message: "Failed to permanently delete selected shipping methods.",
    };
  }
}
