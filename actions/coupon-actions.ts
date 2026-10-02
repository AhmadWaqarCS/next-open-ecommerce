"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  CouponCreateInput,
  CouponUpdateInput,
  CouponStatusToggleInput,
  couponCreateSchema,
  couponUpdateSchema,
  couponStatusToggleSchema,
  bulkSetCouponsStatusSchema,
} from "@/lib/validations";
import {
  createCouponTransaction,
  updateCouponTransaction,
  toggleCouponStatusTransaction,
  deleteCouponTransaction,
  restoreCouponTransaction,
  permanentlyDeleteCouponTransaction,
  bulkDeleteCouponsTransaction,
  bulkRestoreCouponsTransaction,
  bulkSetCouponsStatusTransaction,
  bulkPermanentlyDeleteCouponsTransaction,
} from "@/services/coupon-services";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  CouponFilterParams,
  getCouponFilterWhere,
} from "@/lib/filters/coupon-filters";

export async function createCoupon(
  data: CouponCreateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/coupons");

  const validatedFields = couponCreateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Please correct the invalid fields.",
    };
  }

  const {
    code,
    discount_type,
    discount_value,
    minimum_order_amount,
    max_uses,
    max_uses_per_email,
    starts_at,
    expires_at,
    is_active,
  } = validatedFields.data;

  try {
    const startsAtDate = starts_at ? new Date(starts_at) : new Date();
    const expiresAtDate = expires_at ? new Date(expires_at) : null;

    const created = await createCouponTransaction(
      {
        code,
        discount_type,
        discount_value,
        minimum_order_amount: minimum_order_amount ?? null,
        max_uses: max_uses ?? null,
        max_uses_per_email,
        starts_at: startsAtDate,
        expires_at: expiresAtDate,
        is_active,
      },
      Number(user.id),
    );

    revalidateTag("coupons", "max");
    revalidateTag("cart", "max");
    revalidatePath("/dashboard/coupons");

    await logActivity({
      action: "create_coupon",
      entity_type: "coupon",
      entity_id: created.id,
      user,
      status: "SUCCESS",
      details: { id: created.id, code: created.code, discount_type, discount_value },
    });

    return { success: true, message: `Coupon "${created.code}" created successfully.` };
  } catch (error: any) {
    console.error("Error creating coupon:", error);
    await logActivity({
      action: "create_coupon",
      entity_type: "coupon",
      user,
      status: "FAILED",
      details: { code: validatedFields.data.code, error: String(error) },
    });

    if (error?.message === "COUPON_CODE_EXISTS" || error?.code === "P2002") {
      return {
        success: false,
        errors: { code: "A coupon with this code already exists." },
        message: "Coupon code must be unique.",
      };
    }
    if (error?.message === "COUPON_PERCENTAGE_OVER_100") {
      return {
        success: false,
        errors: { discount_value: "Percentage discount cannot exceed 100%." },
        message: "Percentage discount cannot exceed 100%.",
      };
    }

    return { success: false, message: "Failed to create coupon. Please try again." };
  }
}

export async function updateCoupon(
  id: number,
  data: CouponUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/coupons");

  if (!id || id < 1) {
    return { success: false, message: "Invalid coupon ID provided." };
  }

  const validatedFields = couponUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Please correct the invalid fields.",
    };
  }

  const {
    code,
    discount_type,
    discount_value,
    minimum_order_amount,
    max_uses,
    max_uses_per_email,
    starts_at,
    expires_at,
    is_active,
  } = validatedFields.data;

  try {
    const startsAtDate = starts_at ? new Date(starts_at) : undefined;
    const expiresAtDate =
      expires_at !== undefined
        ? expires_at
          ? new Date(expires_at)
          : null
        : undefined;

    const { updated } = await updateCouponTransaction(
      id,
      {
        code,
        discount_type,
        discount_value,
        minimum_order_amount,
        max_uses,
        max_uses_per_email,
        starts_at: startsAtDate,
        expires_at: expiresAtDate,
        is_active,
      },
      Number(user.id),
    );

    revalidateTag("coupons", "max");
    revalidateTag("cart", "max");
    revalidateTag(`coupon-${updated.code}`, "max");
    revalidatePath("/dashboard/coupons");

    await logActivity({
      action: "update_coupon",
      entity_type: "coupon",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, code: updated.code },
    });

    return { success: true, message: `Coupon "${updated.code}" updated successfully.` };
  } catch (error: any) {
    console.error("Error updating coupon:", error);
    await logActivity({
      action: "update_coupon",
      entity_type: "coupon",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });

    if (error?.message === "COUPON_CODE_EXISTS" || error?.code === "P2002") {
      return {
        success: false,
        errors: { code: "A coupon with this code already exists." },
        message: "Coupon code must be unique.",
      };
    }
    if (error?.message === "COUPON_MAX_USES_BELOW_USAGE") {
      return {
        success: false,
        errors: { max_uses: "Usage limit cannot be less than current redemptions." },
        message: "Usage limit cannot be less than current redemptions.",
      };
    }
    if (error?.message === "COUPON_PERCENTAGE_OVER_100") {
      return {
        success: false,
        errors: { discount_value: "Percentage discount cannot exceed 100%." },
        message: "Percentage discount cannot exceed 100%.",
      };
    }
    if (error?.message === "COUPON_NOT_FOUND") {
      return { success: false, message: "Coupon not found." };
    }

    return { success: false, message: "Failed to update coupon." };
  }
}

export async function toggleCouponStatus(
  id: number,
  is_active: boolean,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/coupons");

  const validated = couponStatusToggleSchema.safeParse({ id, is_active });
  if (!validated.success) {
    return {
      success: false,
      errors: formatZodErrors(validated.error),
      message: "Invalid status parameters.",
    };
  }

  try {
    const { updated } = await toggleCouponStatusTransaction(
      validated.data.id,
      validated.data.is_active,
      Number(user.id),
    );

    revalidateTag("coupons", "max");
    revalidateTag("cart", "max");
    revalidateTag(`coupon-${updated.code}`, "max");
    revalidatePath("/dashboard/coupons");

    await logActivity({
      action: "toggle_coupon_status",
      entity_type: "coupon",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, code: updated.code, is_active: updated.is_active },
    });

    return {
      success: true,
      message: `Coupon "${updated.code}" is now ${updated.is_active ? "active" : "inactive"}.`,
    };
  } catch (error: any) {
    console.error("Error toggling coupon status:", error);
    await logActivity({
      action: "toggle_coupon_status",
      entity_type: "coupon",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, is_active, error: String(error) },
    });

    return { success: false, message: "Failed to update coupon status." };
  }
}

export async function deleteCoupon(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/coupons");

  if (!id || id < 1) {
    return { success: false, message: "Invalid coupon ID." };
  }

  try {
    const { existing } = await deleteCouponTransaction(id, Number(user.id));

    revalidateTag("coupons", "max");
    revalidateTag("cart", "max");
    revalidateTag(`coupon-${existing.code}`, "max");
    revalidatePath("/dashboard/coupons");
    revalidatePath("/dashboard/coupons/trash");

    await logActivity({
      action: "delete_coupon",
      entity_type: "coupon",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, code: existing.code },
    });

    return { success: true, message: `Coupon "${existing.code}" moved to trash.` };
  } catch (error: any) {
    console.error("Error deleting coupon:", error);
    await logActivity({
      action: "delete_coupon",
      entity_type: "coupon",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to delete coupon." };
  }
}

export async function restoreCoupon(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/coupons");

  if (!id || id < 1) {
    return { success: false, message: "Invalid coupon ID." };
  }

  try {
    const { existing } = await restoreCouponTransaction(id, Number(user.id));

    revalidateTag("coupons", "max");
    revalidateTag("cart", "max");
    revalidateTag(`coupon-${existing.code}`, "max");
    revalidatePath("/dashboard/coupons/trash");
    revalidatePath("/dashboard/coupons");

    await logActivity({
      action: "restore_coupon",
      entity_type: "coupon",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, code: existing.code },
    });

    return { success: true, message: `Coupon "${existing.code}" restored successfully.` };
  } catch (error: any) {
    console.error("Error restoring coupon:", error);
    await logActivity({
      action: "restore_coupon",
      entity_type: "coupon",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to restore coupon." };
  }
}

export async function permanentlyDeleteCoupon(
  id: number,
): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/coupons");

  if (!id || id < 1) {
    return { success: false, message: "Invalid coupon ID." };
  }

  try {
    const { existing } = await permanentlyDeleteCouponTransaction(id);

    revalidateTag("coupons", "max");
    revalidateTag("cart", "max");
    revalidateTag(`coupon-${existing.code}`, "max");
    revalidatePath("/dashboard/coupons/trash");

    await logActivity({
      action: "permanently_delete_coupon",
      entity_type: "coupon",
      entity_id: id,
      status: "SUCCESS",
      details: { id, code: existing.code },
    });

    return { success: true, message: `Coupon "${existing.code}" permanently deleted.` };
  } catch (error: any) {
    console.error("Error permanently deleting coupon:", error);
    await logActivity({
      action: "permanently_delete_coupon",
      entity_type: "coupon",
      entity_id: id,
      status: "FAILED",
      details: { id, error: String(error) },
    });

    if (String(error?.message).startsWith("COUPON_HAS_ORDERS")) {
      const count = String(error.message).split(":")[1] || "some";
      return {
        success: false,
        message: `Cannot permanently delete this coupon because it is linked to ${count} completed order(s). It will remain in trash for financial audit integrity.`,
      };
    }

    return { success: false, message: "Failed to permanently delete coupon." };
  }
}

export async function bulkDeleteCoupons(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: CouponFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/coupons");
  const filterWhere =
    selectAllScope && filterParams
      ? await getCouponFilterWhere(filterParams, false)
      : undefined;

  try {
    await bulkDeleteCouponsTransaction(
      ids,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );

    revalidateTag("coupons", "max");
    revalidateTag("cart", "max");
    revalidatePath("/dashboard/coupons");
    revalidatePath("/dashboard/coupons/trash");

    await logActivity({
      action: "bulk_delete_coupons",
      entity_type: "coupon",
      user,
      status: "SUCCESS",
      details: { ids, selectAllScope },
    });

    return { success: true, message: "Selected coupons moved to trash." };
  } catch (error: any) {
    console.error("Error bulk deleting coupons:", error);
    await logActivity({
      action: "bulk_delete_coupons",
      entity_type: "coupon",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return { success: false, message: "Failed to delete selected coupons." };
  }
}

export async function bulkRestoreCoupons(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: CouponFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/coupons");
  const filterWhere =
    selectAllScope && filterParams
      ? await getCouponFilterWhere(filterParams, true)
      : undefined;

  try {
    await bulkRestoreCouponsTransaction(
      ids,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );

    revalidateTag("coupons", "max");
    revalidateTag("cart", "max");
    revalidatePath("/dashboard/coupons/trash");
    revalidatePath("/dashboard/coupons");

    await logActivity({
      action: "bulk_restore_coupons",
      entity_type: "coupon",
      user,
      status: "SUCCESS",
      details: { ids, selectAllScope },
    });

    return { success: true, message: "Selected coupons restored." };
  } catch (error: any) {
    console.error("Error bulk restoring coupons:", error);
    await logActivity({
      action: "bulk_restore_coupons",
      entity_type: "coupon",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return { success: false, message: "Failed to restore selected coupons." };
  }
}

export async function bulkSetCouponsStatus(
  ids: number[],
  is_active: boolean,
  selectAllScope: boolean = false,
  filterParams?: CouponFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/coupons");

  const validated = bulkSetCouponsStatusSchema.safeParse({
    ids,
    is_active,
    selectAllScope,
  });
  if (!validated.success) {
    return {
      success: false,
      errors: formatZodErrors(validated.error),
      message: "Invalid bulk status parameters.",
    };
  }

  const filterWhere =
    selectAllScope && filterParams
      ? await getCouponFilterWhere(filterParams, false)
      : undefined;

  try {
    await bulkSetCouponsStatusTransaction(
      ids,
      is_active,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );

    revalidateTag("coupons", "max");
    revalidateTag("cart", "max");
    revalidatePath("/dashboard/coupons");

    await logActivity({
      action: "bulk_set_coupons_status",
      entity_type: "coupon",
      user,
      status: "SUCCESS",
      details: { ids, is_active, selectAllScope },
    });

    return {
      success: true,
      message: `Status updated to ${is_active ? "active" : "inactive"} for selected coupons.`,
    };
  } catch (error: any) {
    console.error("Error bulk updating coupon status:", error);
    await logActivity({
      action: "bulk_set_coupons_status",
      entity_type: "coupon",
      user,
      status: "FAILED",
      details: { ids, is_active, error: String(error) },
    });
    return { success: false, message: "Failed to update selected coupons status." };
  }
}

export async function bulkPermanentlyDeleteCoupons(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: CouponFilterParams,
): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/coupons");
  const filterWhere =
    selectAllScope && filterParams
      ? await getCouponFilterWhere(filterParams, true)
      : undefined;

  try {
    const result = await bulkPermanentlyDeleteCouponsTransaction(
      ids,
      selectAllScope,
      filterWhere,
    );

    revalidateTag("coupons", "max");
    revalidateTag("cart", "max");
    revalidatePath("/dashboard/coupons/trash");

    await logActivity({
      action: "bulk_permanently_delete_coupons",
      entity_type: "coupon",
      status: "SUCCESS",
      details: { ids, selectAllScope, result },
    });

    if (result.skippedCount > 0) {
      return {
        success: true,
        message: `Permanently deleted ${result.deletedCount} coupon(s). ${result.skippedCount} coupon(s) were preserved because they are associated with completed customer orders.`,
      };
    }

    return {
      success: true,
      message: `Selected ${result.deletedCount} coupon(s) permanently deleted.`,
    };
  } catch (error: any) {
    console.error("Error bulk permanently deleting coupons:", error);
    await logActivity({
      action: "bulk_permanently_delete_coupons",
      entity_type: "coupon",
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return {
      success: false,
      message: "Failed to permanently delete selected coupons.",
    };
  }
}
