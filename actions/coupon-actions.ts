"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  CouponCreateInput,
  CouponUpdateInput,
  couponCreateSchema,
  couponUpdateSchema,
} from "@/lib/validations";
import {
  createCouponTransaction,
  updateCouponTransaction,
  deleteCouponTransaction,
  restoreCouponTransaction,
  permanentlyDeleteCouponTransaction,
  bulkDeleteCouponsTransaction,
  bulkRestoreCouponsTransaction,
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
      message: "Invalid Fields",
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

    await createCouponTransaction(
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
    revalidatePath("/dashboard/coupons");

    await logActivity({
      action: "create_coupon",
      entity_type: "coupon",
      entity_id: code,
      user,
      status: "SUCCESS",
      details: { code, discount_type, discount_value },
    });

    return { success: true, message: "Coupon created successfully." };
  } catch (error: any) {
    console.error("Error creating coupon:", error);
    await logActivity({
      action: "create_coupon",
      entity_type: "coupon",
      user,
      status: "FAILED",
      details: { code: validatedFields.data.code, error: String(error) },
    });
    if (error?.code === "P2002") {
      return {
        success: false,
        errors: { code: "A coupon with this code already exists." },
        message: "Coupon code must be unique.",
      };
    }
    return { success: false, message: "Failed to create coupon." };
  }
}

export async function updateCoupon(
  id: number,
  data: CouponUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/coupons");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const validatedFields = couponUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
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

    return { success: true, message: "Coupon updated successfully." };
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
    if (error?.code === "P2002") {
      return {
        success: false,
        errors: { code: "A coupon with this code already exists." },
        message: "Coupon code must be unique.",
      };
    }
    return { success: false, message: "Failed to update coupon." };
  }
}

export async function deleteCoupon(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/coupons");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const { existing } = await deleteCouponTransaction(id, Number(user.id));

    revalidateTag("coupons", "max");
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

    return { success: true, message: "Coupon moved to trash." };
  } catch (error) {
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

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const { existing } = await restoreCouponTransaction(id, Number(user.id));

    revalidateTag("coupons", "max");
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

    return { success: true, message: "Coupon restored successfully." };
  } catch (error) {
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

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const { existing } = await permanentlyDeleteCouponTransaction(id);

    revalidateTag("coupons", "max");
    revalidateTag(`coupon-${existing.code}`, "max");
    revalidatePath("/dashboard/coupons/trash");

    await logActivity({
      action: "permanently_delete_coupon",
      entity_type: "coupon",
      entity_id: id,
      status: "SUCCESS",
      details: { id, code: existing.code },
    });

    return { success: true, message: "Coupon permanently deleted." };
  } catch (error) {
    console.error("Error permanently deleting coupon:", error);
    await logActivity({
      action: "permanently_delete_coupon",
      entity_type: "coupon",
      entity_id: id,
      status: "FAILED",
      details: { id, error: String(error) },
    });
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
    revalidatePath("/dashboard/coupons");
    revalidatePath("/dashboard/coupons/trash");

    await logActivity({
      action: "bulk_delete_coupons",
      entity_type: "coupon",
      user,
      status: "SUCCESS",
      details: { ids },
    });

    return { success: true, message: "Selected coupons moved to trash." };
  } catch (error) {
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
    revalidatePath("/dashboard/coupons/trash");
    revalidatePath("/dashboard/coupons");

    await logActivity({
      action: "bulk_restore_coupons",
      entity_type: "coupon",
      user,
      status: "SUCCESS",
      details: { ids },
    });

    return { success: true, message: "Selected coupons restored." };
  } catch (error) {
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
    await bulkPermanentlyDeleteCouponsTransaction(ids, selectAllScope, filterWhere);

    revalidateTag("coupons", "max");
    revalidatePath("/dashboard/coupons/trash");

    await logActivity({
      action: "bulk_permanently_delete_coupons",
      entity_type: "coupon",
      status: "SUCCESS",
      details: { ids },
    });

    return { success: true, message: "Selected coupons permanently deleted." };
  } catch (error) {
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
