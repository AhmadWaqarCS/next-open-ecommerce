"use server";

import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  OrderRefundCreateInput,
  OrderRefundUpdateInput,
  orderRefundCreateSchema,
  orderRefundUpdateSchema,
} from "@/lib/validations";
import {
  createOrderRefundInDB,
  updateOrderRefundInDB,
  deleteOrderRefundPermanentlyInDB,
} from "@/services/payment-services";
import { revalidatePath } from "next/cache";

export async function createOrderRefund(
  data: OrderRefundCreateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/orders");

  const validatedFields = orderRefundCreateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const { order_id, amount, reason, provider_refund_id, status, refunded_at } =
    validatedFields.data;

  try {
    await createOrderRefundInDB({
      order_id,
      amount,
      reason: reason || null,
      provider_refund_id: provider_refund_id || null,
      status,
      refunded_at: refunded_at ? new Date(refunded_at) : null,
      created_by: Number(user.id),
    });

    revalidatePath("/dashboard/orders");

    return { success: true, message: "Order refund created successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to create order refund." };
  }
}

export async function updateOrderRefund(
  id: number,
  data: OrderRefundUpdateInput,
): Promise<ActionResponse> {
  await assertPermission("update", "/dashboard/orders");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const validatedFields = orderRefundUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const { status, provider_refund_id, refunded_at } = validatedFields.data;

  try {
    await updateOrderRefundInDB(id, {
      status,
      provider_refund_id:
        provider_refund_id !== undefined ? provider_refund_id || null : undefined,
      refunded_at: refunded_at ? new Date(refunded_at) : undefined,
    });

    revalidatePath("/dashboard/orders");

    return { success: true, message: "Order refund updated successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update order refund." };
  }
}

export async function deleteOrderRefund(id: number): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/orders");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await deleteOrderRefundPermanentlyInDB(id);

    revalidatePath("/dashboard/orders");

    return { success: true, message: "Order refund deleted." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to delete order refund." };
  }
}
