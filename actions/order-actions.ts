"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
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
  createOrderRefundTransaction,
  updateOrderRefundTransaction,
} from "@/services/payment-services";
import {
  updateOrderTransaction,
  deleteOrderTransaction,
  restoreOrderTransaction,
  permanentlyDeleteOrderTransaction,
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

  const {
    payment_status,
    fulfillment_status,
    tracking_number,
    tracking_url,
    carrier_name,
    shipped_at,
    delivered_at,
    admin_notes,
    cancelled_at,
    paid_at,
  } = validatedFields.data;

  try {
    await updateOrderTransaction(
      id,
      {
        payment_status,
        fulfillment_status,
        tracking_number:
          tracking_number !== undefined ? tracking_number || null : undefined,
        tracking_url:
          tracking_url !== undefined ? tracking_url || null : undefined,
        carrier_name:
          carrier_name !== undefined ? carrier_name || null : undefined,
        shipped_at: shipped_at ? new Date(shipped_at) : undefined,
        delivered_at: delivered_at ? new Date(delivered_at) : undefined,
        paid_at: paid_at ? new Date(paid_at) : undefined,
        cancelled_at: cancelled_at ? new Date(cancelled_at) : undefined,
        admin_notes: admin_notes !== undefined ? admin_notes || null : undefined,
      },
      Number(user.id),
    );
    revalidatePath("/dashboard/orders");
    revalidatePath(`/dashboard/orders/${id}`);

    await logActivity({
      action: "update_order",
      entity_type: "order",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, payment_status, fulfillment_status },
    });

    return { success: true, message: "Order updated successfully." };
  } catch (error: any) {
    console.error(error);
    await logActivity({
      action: "update_order",
      entity_type: "order",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    if (error?.message === "ORDER_CANCELLED_CANNOT_BE_EDITED") {
      return { success: false, message: "Cancelled orders cannot be edited." };
    }
    return { success: false, message: "Failed to update order." };
  }
}

export async function deleteOrder(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/orders");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await deleteOrderTransaction(id, Number(user.id));
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/orders/trash");

    await logActivity({
      action: "delete_order",
      entity_type: "order",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return { success: true, message: "Order deleted successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "delete_order",
      entity_type: "order",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to delete order." };
  }
}

export async function restoreOrder(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/orders");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await restoreOrderTransaction(id, Number(user.id));
    revalidatePath("/dashboard/orders/trash");
    revalidatePath("/dashboard/orders");

    await logActivity({
      action: "restore_order",
      entity_type: "order",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return { success: true, message: "Order restored successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "restore_order",
      entity_type: "order",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to restore order." };
  }
}

export async function permanentlyDeleteOrder(
  id: number,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/orders");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await permanentlyDeleteOrderTransaction(id);
    revalidatePath("/dashboard/orders/trash");

    await logActivity({
      action: "permanently_delete_order",
      entity_type: "order",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return { success: true, message: "Order permanently deleted." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "permanently_delete_order",
      entity_type: "order",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
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
    await createOrderRefundTransaction(
      {
        order_id,
        amount,
        reason: reason || null,
        provider_refund_id: provider_refund_id || null,
        status,
        refunded_at: refunded_at ? new Date(refunded_at) : null,
      },
      Number(user.id),
    );
    revalidatePath("/dashboard/orders");
    revalidatePath(`/dashboard/orders/${order_id}`);

    await logActivity({
      action: "create_order_refund",
      entity_type: "order_refund",
      user,
      status: "SUCCESS",
      details: { order_id, amount },
    });

    return { success: true, message: "Refund created successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "create_order_refund",
      entity_type: "order_refund",
      user,
      status: "FAILED",
      details: { order_id, error: String(error) },
    });
    return { success: false, message: "Failed to create refund." };
  }
}

export async function updateOrderRefund(
  id: number,
  data: OrderRefundUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/orders");

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
    await updateOrderRefundTransaction(id, {
      status,
      provider_refund_id:
        provider_refund_id !== undefined ? provider_refund_id || null : undefined,
      refunded_at: refunded_at ? new Date(refunded_at) : undefined,
    });
    revalidatePath("/dashboard/orders");

    await logActivity({
      action: "update_order_refund",
      entity_type: "order_refund",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, status },
    });

    return { success: true, message: "Refund updated successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "update_order_refund",
      entity_type: "order_refund",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to update refund." };
  }
}
