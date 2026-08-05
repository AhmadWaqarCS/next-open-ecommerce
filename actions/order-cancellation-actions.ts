"use server";

import prisma from "@/lib/prisma";
import { revalidateTag, revalidatePath } from "next/cache";
import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import {
  requestCancellationOtpSchema,
  confirmCancellationOtpSchema,
  RequestCancellationOtpInput,
  ConfirmCancellationOtpInput,
} from "@/lib/validations";
import {
  createCancellationOtpTransaction,
  incrementOtpAttemptTransaction,
  deleteOtpTransaction,
  cancelOrderInDB,
} from "@/services/order-services";
import {
  sendOrderCancellationOtpEmail,
  sendOrderCancelledConfirmationEmail,
} from "@/services/email-services";

export type CancellationActionResponse = ActionResponse & {
  requiresOtp?: boolean;
};

/**
 * Public action to request an OTP code for order cancellation.
 */
export async function requestOrderCancellationOtpAction(
  data: RequestCancellationOtpInput,
): Promise<CancellationActionResponse> {
  const validated = requestCancellationOtpSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      errors: formatZodErrors(validated.error),
      message: "Please provide a valid order number and email address.",
    };
  }

  const { order_number, email } = validated.data;
  const cleanEmail = email.toLowerCase().trim();
  const cleanOrderNumber = order_number.trim();

  try {
    const order = await prisma.order.findFirst({
      where: {
        order_number: cleanOrderNumber,
        customer_email: { equals: cleanEmail, mode: "insensitive" },
        deleted_at: null,
      },
      select: {
        id: true,
        order_number: true,
        customer_email: true,
        customer_first_name: true,
        customer_last_name: true,
        fulfillment_status: true,
        cancelled_at: true,
      },
    });

    if (!order) {
      return {
        success: false,
        message: "No active order found matching this order number and email address.",
      };
    }

    if (order.cancelled_at || order.fulfillment_status === "cancelled") {
      return {
        success: false,
        message: "This order has already been cancelled.",
      };
    }

    if (
      order.fulfillment_status === "shipped" ||
      order.fulfillment_status === "delivered"
    ) {
      return {
        success: false,
        message:
          "This order cannot be cancelled online because it has already been shipped or delivered. Please contact support.",
      };
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await createCancellationOtpTransaction({
      order_number: cleanOrderNumber,
      email: cleanEmail,
      otp_code: otpCode,
      expires_at: expiresAt,
    });

    const customerName = `${order.customer_first_name} ${order.customer_last_name}`.trim();

    const emailResult = await sendOrderCancellationOtpEmail({
      toEmail: cleanEmail,
      customerName,
      orderNumber: cleanOrderNumber,
      otpCode,
      expiresMinutes: 10,
    });

    if (!emailResult.success) {
      return {
        success: false,
        message: `Failed to send verification email: ${emailResult.error || "Please verify SMTP setup."}`,
      };
    }

    return {
      success: true,
      requiresOtp: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}.`,
    };
  } catch (error: any) {
    console.error("[requestOrderCancellationOtpAction] Error:", error);
    return {
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    };
  }
}

/**
 * Public action to confirm order cancellation using the emailed 6-digit OTP code.
 */
export async function confirmOrderCancellationWithOtpAction(
  data: ConfirmCancellationOtpInput,
): Promise<CancellationActionResponse> {
  const validated = confirmCancellationOtpSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      errors: formatZodErrors(validated.error),
      message: "Please enter the complete 6-digit verification code.",
    };
  }

  const { order_number, email, otp_code, reason } = validated.data;
  const cleanEmail = email.toLowerCase().trim();
  const cleanOrderNumber = order_number.trim();
  const cleanOtp = otp_code.trim();

  try {
    const otpRecord = await prisma.order_otp_verification.findFirst({
      where: {
        order_number: cleanOrderNumber,
        email: cleanEmail,
        type: "order_cancellation",
      },
      orderBy: { created_at: "desc" },
    });

    if (!otpRecord) {
      return {
        success: false,
        message: "No active cancellation session found. Please request a new code.",
      };
    }

    if (new Date() > otpRecord.expires_at) {
      try {
        await deleteOtpTransaction(otpRecord.id);
      } catch {}
      return {
        success: false,
        message: "Verification code has expired. Please request a new code.",
      };
    }

    if (otpRecord.attempts >= 5) {
      try {
        await deleteOtpTransaction(otpRecord.id);
      } catch {}
      return {
        success: false,
        message: "Too many failed attempts. Please request a new verification code.",
      };
    }

    if (otpRecord.otp_code !== cleanOtp) {
      await incrementOtpAttemptTransaction(otpRecord.id);
      const remaining = 4 - otpRecord.attempts;
      return {
        success: false,
        message: `Invalid verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new code."}`,
      };
    }

    // OTP verified successfully! Cancel order & restore inventory in DB
    const cancelledOrder = await cancelOrderInDB({
      order_number: cleanOrderNumber,
      email: cleanEmail,
      reason,
    });

    // Delete consumed OTP record
    try {
      await deleteOtpTransaction(otpRecord.id);
    } catch {}

    // Send confirmation receipt email
    try {
      const customerName = `${cancelledOrder.customer_first_name} ${cancelledOrder.customer_last_name}`.trim();
      await sendOrderCancelledConfirmationEmail({
        toEmail: cleanEmail,
        customerName,
        orderNumber: cleanOrderNumber,
      });
    } catch (emailErr) {
      console.error("[confirmOrderCancellationWithOtpAction] Receipt email error:", emailErr);
    }

    // Revalidate storefront cache tags
    try {
      revalidateTag("home-page", "max");
      revalidateTag(`order-${cancelledOrder.id}`, "max");
      revalidatePath(`/order/${cleanOrderNumber}`);
    } catch {}

    return {
      success: true,
      message: "Your order has been successfully cancelled.",
    };
  } catch (error: any) {
    if (error?.message === "ORDER_ALREADY_CANCELLED") {
      return {
        success: false,
        message: "This order has already been cancelled.",
      };
    }
    if (error?.message === "ORDER_CANNOT_BE_CANCELLED_SHIPPED") {
      return {
        success: false,
        message: "Order cannot be cancelled because it has already been shipped.",
      };
    }
    console.error("[confirmOrderCancellationWithOtpAction] Error:", error);
    return {
      success: false,
      message: "Failed to cancel order. Please try again.",
    };
  }
}
