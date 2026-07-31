"use server";

import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  CouponCreateInput,
  CouponUpdateInput,
  couponCreateSchema,
  couponUpdateSchema,
} from "@/lib/validations";
import {
  createCouponInDB,
  deleteCouponPermanentlyInDB,
  updateCouponInDB,
  bulkUpdateCouponsInDB,
  bulkDeleteCouponsPermanentlyInDB,
} from "@/services/coupon-services";
import { revalidatePath, revalidateTag } from "next/cache";
import { CouponFilterParams, getCouponFilterWhere } from "@/lib/filters/coupon-filters";

export async function createCoupon(
  data: CouponCreateInput
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

    await createCouponInDB({
      code,
      discount_type,
      discount_value,
      minimum_order_amount: minimum_order_amount ?? null,
      max_uses: max_uses ?? null,
      max_uses_per_email,
      starts_at: startsAtDate,
      expires_at: expiresAtDate,
      is_active,
      created_by: Number(user.id),
      updated_by: Number(user.id),
    });

    revalidateTag("coupons", "max");
    revalidatePath("/dashboard/coupons");

    return { success: true, message: "Coupon created successfully." };
  } catch (error: any) {
    console.error("Error creating coupon:", error);
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
  data: CouponUpdateInput
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

    const result = await updateCouponInDB(id, {
      code,
      discount_type,
      discount_value,
      minimum_order_amount,
      max_uses,
      max_uses_per_email,
      starts_at: startsAtDate,
      expires_at: expiresAtDate,
      is_active,
      updated_by: Number(user.id),
    });

    revalidateTag("coupons", "max");
    revalidateTag(`coupon-${result.code}`, "max");
    revalidatePath("/dashboard/coupons");

    return { success: true, message: "Coupon updated successfully." };
  } catch (error: any) {
    console.error("Error updating coupon:", error);
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
    const result = await updateCouponInDB(id, {
      updated_by: Number(user.id),
      deleted_at: new Date(),
      deleted_by: Number(user.id),
    });

    revalidateTag("coupons", "max");
    revalidateTag(`coupon-${result.code}`, "max");
    revalidatePath("/dashboard/coupons");
    revalidatePath("/dashboard/coupons/trash");

    return { success: true, message: "Coupon moved to trash." };
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return { success: false, message: "Failed to delete coupon." };
  }
}

export async function restoreCoupon(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/coupons");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const result = await updateCouponInDB(id, {
      updated_by: Number(user.id),
      deleted_at: null,
      deleted_by: null,
    });

    revalidateTag("coupons", "max");
    revalidateTag(`coupon-${result.code}`, "max");
    revalidatePath("/dashboard/coupons/trash");
    revalidatePath("/dashboard/coupons");

    return { success: true, message: "Coupon restored successfully." };
  } catch (error) {
    console.error("Error restoring coupon:", error);
    return { success: false, message: "Failed to restore coupon." };
  }
}

export async function permanentlyDeleteCoupon(id: number): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/coupons");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const result = await deleteCouponPermanentlyInDB(id);

    revalidateTag("coupons", "max");
    revalidateTag(`coupon-${result.code}`, "max");
    revalidatePath("/dashboard/coupons/trash");

    return { success: true, message: "Coupon permanently deleted." };
  } catch (error) {
    console.error("Error permanently deleting coupon:", error);
    return { success: false, message: "Failed to permanently delete coupon." };
  }
}

export async function bulkDeleteCoupons(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: CouponFilterParams
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/coupons");
  const filterWhere = selectAllScope && filterParams ? await getCouponFilterWhere(filterParams, false) : undefined;

  try {
    await bulkUpdateCouponsInDB(
      ids,
      {
        updated_by: Number(user.id),
        deleted_at: new Date(),
        deleted_by: Number(user.id),
      },
      selectAllScope,
      false,
      filterWhere
    );

    revalidateTag("coupons", "max");
    revalidatePath("/dashboard/coupons");
    revalidatePath("/dashboard/coupons/trash");

    return { success: true, message: "Selected coupons moved to trash." };
  } catch (error) {
    console.error("Error bulk deleting coupons:", error);
    return { success: false, message: "Failed to delete selected coupons." };
  }
}

export async function bulkRestoreCoupons(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: CouponFilterParams
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/coupons");
  const filterWhere = selectAllScope && filterParams ? await getCouponFilterWhere(filterParams, true) : undefined;

  try {
    await bulkUpdateCouponsInDB(
      ids,
      {
        updated_by: Number(user.id),
        deleted_at: null,
        deleted_by: null,
      },
      selectAllScope,
      true,
      filterWhere
    );

    revalidateTag("coupons", "max");
    revalidatePath("/dashboard/coupons/trash");
    revalidatePath("/dashboard/coupons");

    return { success: true, message: "Selected coupons restored." };
  } catch (error) {
    console.error("Error bulk restoring coupons:", error);
    return { success: false, message: "Failed to restore selected coupons." };
  }
}

export async function bulkPermanentlyDeleteCoupons(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: CouponFilterParams
): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/coupons");
  const filterWhere = selectAllScope && filterParams ? await getCouponFilterWhere(filterParams, true) : undefined;

  try {
    await bulkDeleteCouponsPermanentlyInDB(ids, selectAllScope, filterWhere);

    revalidateTag("coupons", "max");
    revalidatePath("/dashboard/coupons/trash");

    return { success: true, message: "Selected coupons permanently deleted." };
  } catch (error) {
    console.error("Error bulk permanently deleting coupons:", error);
    return {
      success: false,
      message: "Failed to permanently delete selected coupons.",
    };
  }
}
