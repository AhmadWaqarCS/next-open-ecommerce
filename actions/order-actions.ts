"use server";

import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  OrderRefundCreateInput,
  OrderRefundUpdateInput,
  OrderUpdateInput,
  orderRefundCreateSchema,
  orderRefundUpdateSchema,
  orderUpdateSchema,
} from "@/lib/validations";
import {
  createOrderRefundInDB,
  updateOrderRefundInDB,
} from "@/services/payment-services";
import {
  deleteOrderPermanentlyInDB,
  updateOrderInDB,
} from "@/services/order-services";
import { revalidatePath } from "next/cache";

// ─── ORDER ────────────────────────────────────────────────────────────────────

export async function updateOrder(
  id: number,
  data: OrderUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/orders");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const validatedFields = orderUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const { payment_status, fulfillment_status, tracking_number, tracking_url,
    carrier_name, shipped_at, delivered_at, admin_notes, cancelled_at, paid_at } =
    validatedFields.data;

  try {
    await updateOrderInDB(id, {
      payment_status,
      fulfillment_status,
      tracking_number: tracking_number !== undefined ? tracking_number || null : undefined,
      tracking_url: tracking_url !== undefined ? tracking_url || null : undefined,
      carrier_name: carrier_name !== undefined ? carrier_name || null : undefined,
      shipped_at: shipped_at ? new Date(shipped_at) : undefined,
      delivered_at: delivered_at ? new Date(delivered_at) : undefined,
      paid_at: paid_at ? new Date(paid_at) : undefined,
      cancelled_at: cancelled_at ? new Date(cancelled_at) : undefined,
      admin_notes: admin_notes !== undefined ? admin_notes || null : undefined,
      updated_by: Number(user.id),
    });
    revalidatePath("/dashboard/orders");
    revalidatePath(`/dashboard/orders/${id}`);
    return { success: true, message: "Order updated successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to update order." };
  }
}

export async function deleteOrder(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/orders");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await updateOrderInDB(id, {
      updated_by: Number(user.id),
      deleted_at: new Date(),
      deleted_by: Number(user.id),
    });
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/orders/trash");
    return { success: true, message: "Order deleted successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to delete order." };
  }
}

export async function restoreOrder(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/orders");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await updateOrderInDB(id, {
      updated_by: Number(user.id),
      deleted_at: null,
      deleted_by: null,
    });
    revalidatePath("/dashboard/orders/trash");
    revalidatePath("/dashboard/orders");
    return { success: true, message: "Order restored successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to restore order." };
  }
}

export async function permanentlyDeleteOrder(id: number): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/orders");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await deleteOrderPermanentlyInDB(id);
    revalidatePath("/dashboard/orders/trash");
    return { success: true, message: "Order permanently deleted." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to permanently delete order." };
  }
}

// ─── ORDER REFUNDS ────────────────────────────────────────────────────────────

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
    revalidatePath(`/dashboard/orders/${order_id}`);
    return { success: true, message: "Refund created successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to create refund." };
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
      provider_refund_id: provider_refund_id !== undefined ? provider_refund_id || null : undefined,
      refunded_at: refunded_at ? new Date(refunded_at) : undefined,
    });
    revalidatePath("/dashboard/orders");
    return { success: true, message: "Refund updated successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to update refund." };
  }
}
