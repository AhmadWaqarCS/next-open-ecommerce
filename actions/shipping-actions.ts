"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  ShippingMethodCreateInput,
  ShippingMethodUpdateInput,
  ShippingMethodStatusToggleInput,
  BulkSetShippingMethodsStatusInput,
  shippingMethodCreateSchema,
  shippingMethodUpdateSchema,
  shippingMethodStatusToggleSchema,
  bulkSetShippingMethodsStatusSchema,
} from "@/lib/validations";
import {
  createShippingMethodTransaction,
  updateShippingMethodTransaction,
  toggleShippingMethodStatusTransaction,
  deleteShippingMethodTransaction,
  restoreShippingMethodTransaction,
  permanentlyDeleteShippingMethodTransaction,
  bulkDeleteShippingMethodsTransaction,
  bulkSetShippingMethodsStatusTransaction,
  bulkRestoreShippingMethodsTransaction,
  bulkPermanentlyDeleteShippingMethodsTransaction,
} from "@/services/shipping-services";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  ShippingFilterParams,
  getShippingFilterWhere,
} from "@/lib/filters/shipping-filters";

function invalidateShippingCache() {
  try {
    revalidateTag("checkout", "max");
    revalidateTag("shipping", "max");
    revalidatePath("/dashboard/shipping");
    revalidatePath("/dashboard/shipping/trash");
    revalidatePath("/checkout");
  } catch (error) {
    console.error("Cache invalidation failed for shipping:", error);
  }
}

export async function createShippingMethod(
  data: ShippingMethodCreateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/shipping");

  const validatedFields = shippingMethodCreateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Please correct the errors in the form.",
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
    const created = await createShippingMethodTransaction(
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

    invalidateShippingCache();

    await logActivity({
      action: "create_shipping_method",
      entity_type: "shipping_method",
      entity_id: created.id,
      user,
      status: "SUCCESS",
      details: { name, price, is_active },
    });

    return { success: true, message: "Shipping method created successfully." };
  } catch (error: any) {
    console.error("createShippingMethod error:", error);
    await logActivity({
      action: "create_shipping_method",
      entity_type: "shipping_method",
      user,
      status: "FAILED",
      details: { name, error: error?.message || String(error) },
    });
    return {
      success: false,
      message: error?.message || "Failed to create shipping method.",
    };
  }
}

export async function updateShippingMethod(
  id: number,
  data: ShippingMethodUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/shipping");

  if (!id || id < 1) {
    return { success: false, message: "Invalid shipping method ID." };
  }

  const validatedFields = shippingMethodUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Please correct the errors in the form.",
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

    invalidateShippingCache();

    await logActivity({
      action: "update_shipping_method",
      entity_type: "shipping_method",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, name, price, is_active },
    });

    return { success: true, message: "Shipping method updated successfully." };
  } catch (error: any) {
    console.error("updateShippingMethod error:", error);
    await logActivity({
      action: "update_shipping_method",
      entity_type: "shipping_method",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: error?.message || String(error) },
    });
    return {
      success: false,
      message: error?.message || "Failed to update shipping method.",
    };
  }
}

export async function toggleShippingMethodStatus(
  id: number,
  is_active: boolean,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/shipping");

  const validated = shippingMethodStatusToggleSchema.safeParse({ id, is_active });
  if (!validated.success) {
    return {
      success: false,
      errors: formatZodErrors(validated.error),
      message: "Invalid status toggle data.",
    };
  }

  try {
    const { updated } = await toggleShippingMethodStatusTransaction(
      id,
      is_active,
      Number(user.id),
    );

    invalidateShippingCache();

    await logActivity({
      action: "toggle_shipping_method_status",
      entity_type: "shipping_method",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, name: updated.name, is_active },
    });

    return {
      success: true,
      message: `Shipping method "${updated.name}" is now ${is_active ? "active" : "inactive"}.`,
    };
  } catch (error: any) {
    console.error("toggleShippingMethodStatus error:", error);
    await logActivity({
      action: "toggle_shipping_method_status",
      entity_type: "shipping_method",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, is_active, error: error?.message || String(error) },
    });
    return {
      success: false,
      message: error?.message || "Failed to update shipping method status.",
    };
  }
}

export async function deleteShippingMethod(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/shipping");

  if (!id || id < 1) {
    return { success: false, message: "Invalid shipping method ID." };
  }

  try {
    const { existing } = await deleteShippingMethodTransaction(id, Number(user.id));

    invalidateShippingCache();

    await logActivity({
      action: "delete_shipping_method",
      entity_type: "shipping_method",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, name: existing.name },
    });

    return { success: true, message: `Shipping method "${existing.name}" moved to trash.` };
  } catch (error: any) {
    console.error("deleteShippingMethod error:", error);
    await logActivity({
      action: "delete_shipping_method",
      entity_type: "shipping_method",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: error?.message || String(error) },
    });
    return {
      success: false,
      message: error?.message || "Failed to delete shipping method.",
    };
  }
}

export async function restoreShippingMethod(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/shipping");

  if (!id || id < 1) {
    return { success: false, message: "Invalid shipping method ID." };
  }

  try {
    const { existing } = await restoreShippingMethodTransaction(id, Number(user.id));

    invalidateShippingCache();

    await logActivity({
      action: "restore_shipping_method",
      entity_type: "shipping_method",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, name: existing.name },
    });

    return { success: true, message: `Shipping method "${existing.name}" restored successfully.` };
  } catch (error: any) {
    console.error("restoreShippingMethod error:", error);
    await logActivity({
      action: "restore_shipping_method",
      entity_type: "shipping_method",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: error?.message || String(error) },
    });
    return {
      success: false,
      message: error?.message || "Failed to restore shipping method.",
    };
  }
}

export async function permanentlyDeleteShippingMethod(
  id: number,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/shipping");

  if (!id || id < 1) {
    return { success: false, message: "Invalid shipping method ID." };
  }

  try {
    const { existing } = await permanentlyDeleteShippingMethodTransaction(id);

    invalidateShippingCache();

    await logActivity({
      action: "permanently_delete_shipping_method",
      entity_type: "shipping_method",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, name: existing.name },
    });

    return {
      success: true,
      message: `Shipping method "${existing.name}" permanently deleted.`,
    };
  } catch (error: any) {
    console.error("permanentlyDeleteShippingMethod error:", error);
    await logActivity({
      action: "permanently_delete_shipping_method",
      entity_type: "shipping_method",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: error?.message || String(error) },
    });
    return {
      success: false,
      message: error?.message || "Failed to permanently delete shipping method.",
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
    const result = await bulkDeleteShippingMethodsTransaction(
      ids,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );

    invalidateShippingCache();

    await logActivity({
      action: "bulk_delete_shipping_methods",
      entity_type: "shipping_method",
      user,
      status: "SUCCESS",
      details: { count: result.count, selectAllScope },
    });

    return {
      success: true,
      message: `${result.count} shipping method(s) moved to trash.`,
    };
  } catch (error: any) {
    console.error("bulkDeleteShippingMethods error:", error);
    await logActivity({
      action: "bulk_delete_shipping_methods",
      entity_type: "shipping_method",
      user,
      status: "FAILED",
      details: { ids, error: error?.message || String(error) },
    });
    return {
      success: false,
      message: error?.message || "Failed to delete selected shipping methods.",
    };
  }
}

export async function bulkSetShippingMethodsStatus(
  ids: number[],
  is_active: boolean,
  selectAllScope: boolean = false,
  filterParams?: ShippingFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/shipping");

  const validated = bulkSetShippingMethodsStatusSchema.safeParse({
    ids,
    is_active,
    selectAllScope,
  });

  if (!validated.success) {
    return {
      success: false,
      errors: formatZodErrors(validated.error),
      message: "Invalid bulk status update data.",
    };
  }

  const filterWhere =
    selectAllScope && filterParams
      ? await getShippingFilterWhere(filterParams, false)
      : undefined;

  try {
    const result = await bulkSetShippingMethodsStatusTransaction(
      ids,
      is_active,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );

    invalidateShippingCache();

    await logActivity({
      action: "bulk_set_shipping_methods_status",
      entity_type: "shipping_method",
      user,
      status: "SUCCESS",
      details: { count: result.count, is_active, selectAllScope },
    });

    return {
      success: true,
      message: `${result.count} shipping method(s) set to ${is_active ? "active" : "inactive"}.`,
    };
  } catch (error: any) {
    console.error("bulkSetShippingMethodsStatus error:", error);
    await logActivity({
      action: "bulk_set_shipping_methods_status",
      entity_type: "shipping_method",
      user,
      status: "FAILED",
      details: { ids, is_active, error: error?.message || String(error) },
    });
    return {
      success: false,
      message: error?.message || "Failed to update selected shipping methods status.",
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
    const result = await bulkRestoreShippingMethodsTransaction(
      ids,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );

    invalidateShippingCache();

    await logActivity({
      action: "bulk_restore_shipping_methods",
      entity_type: "shipping_method",
      user,
      status: "SUCCESS",
      details: { count: result.count, selectAllScope },
    });

    return {
      success: true,
      message: `${result.count} shipping method(s) restored successfully.`,
    };
  } catch (error: any) {
    console.error("bulkRestoreShippingMethods error:", error);
    await logActivity({
      action: "bulk_restore_shipping_methods",
      entity_type: "shipping_method",
      user,
      status: "FAILED",
      details: { ids, error: error?.message || String(error) },
    });
    return {
      success: false,
      message: error?.message || "Failed to restore selected shipping methods.",
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
    const result = await bulkPermanentlyDeleteShippingMethodsTransaction(
      ids,
      selectAllScope,
      filterWhere,
    );

    invalidateShippingCache();

    await logActivity({
      action: "bulk_permanently_delete_shipping_methods",
      entity_type: "shipping_method",
      user,
      status: "SUCCESS",
      details: { count: result.count, skippedCount: result.skippedCount, selectAllScope },
    });

    const msg =
      result.skippedCount > 0
        ? `${result.count} shipping method(s) permanently deleted. ${result.skippedCount} method(s) were kept because they have associated orders.`
        : `${result.count} shipping method(s) permanently deleted.`;

    return {
      success: true,
      message: msg,
    };
  } catch (error: any) {
    console.error("bulkPermanentlyDeleteShippingMethods error:", error);
    await logActivity({
      action: "bulk_permanently_delete_shipping_methods",
      entity_type: "shipping_method",
      user,
      status: "FAILED",
      details: { ids, error: error?.message || String(error) },
    });
    return {
      success: false,
      message: error?.message || "Failed to permanently delete selected shipping methods.",
    };
  }
}
