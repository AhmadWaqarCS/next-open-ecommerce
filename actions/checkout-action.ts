"use server";

import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import { checkoutFormSchema, CheckoutFormInput } from "@/lib/validations";
import {
  sendInvoiceAndOrderEmailsForOrder,
  sendCodOtpEmail,
} from "@/services/email-services";
import {
  processCheckoutTransaction,
  ProcessCheckoutInput,
  createCodOtpTransaction,
  incrementCodOtpAttemptTransaction,
  deleteCodOtpTransaction,
} from "@/services/order-services";

import { createStripeCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import { getSiteConfig } from "@/lib/storefront";

export type PlaceOrderResponse = ActionResponse & {
  orderNumber?: string;
  requiresOtp?: boolean;
  verificationId?: number;
  email?: string;
  checkoutUrl?: string;
};

/**
 * Public (loginless) server action.
 * If payment method is Cash on Delivery (COD), saves temporary draft order payload
 * and dispatches a 6-digit OTP code to the customer email.
 * Otherwise, creates order + order_items[] + payment_transaction immediately.
 */
export async function placeOrder(
  data: CheckoutFormInput,
): Promise<PlaceOrderResponse> {
  const validatedFields = checkoutFormSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Please fix the errors below.",
    };
  }

  const {
    customer_email,
    customer_first_name,
    customer_last_name,
    customer_phone,
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_state,
    shipping_postal_code,
    shipping_country,
    billing_same_as_shipping,
    billing_address_line1,
    billing_address_line2,
    billing_city,
    billing_state,
    billing_postal_code,
    billing_country,
    shipping_method_id,
    shipping_method_name,
    shipping_cost,
    payment_method_id,
    payment_method,
    payment_method_name,
    coupon_code,
    customer_notes,
    items,
  } = validatedFields.data;

  const resolvedPaymentName =
    payment_method_name ||
    (payment_method === "cash_on_delivery" ? "Cash on Delivery" : payment_method);

  const billingLine1 = billing_same_as_shipping
    ? shipping_address_line1
    : (billing_address_line1 ?? shipping_address_line1);
  const billingLine2 = billing_same_as_shipping
    ? (shipping_address_line2 ?? null)
    : (billing_address_line2 ?? null);
  const billingCity = billing_same_as_shipping
    ? shipping_city
    : (billing_city ?? shipping_city);
  const billingState = billing_same_as_shipping
    ? (shipping_state ?? null)
    : (billing_state ?? null);
  const billingPostal = billing_same_as_shipping
    ? shipping_postal_code
    : (billing_postal_code ?? shipping_postal_code);
  const billingCountry = billing_same_as_shipping
    ? shipping_country
    : ((billing_country?.toUpperCase()) ?? shipping_country);

  let customerIp: string | null = null;
  let customerUserAgent: string | null = null;
  try {
    const reqHeaders = await headers();
    customerIp =
      reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      reqHeaders.get("x-real-ip") ??
      null;
    customerUserAgent = reqHeaders.get("user-agent") ?? null;
  } catch {
    // Ignore headers lookup failures in non-standard runtime contexts
  }

  const checkoutInputPayload: ProcessCheckoutInput = {
    customer_email,
    customer_first_name,
    customer_last_name,
    customer_phone: customer_phone ?? null,
    customer_ip: customerIp,
    customer_user_agent: customerUserAgent,

    billing_address_line1: billingLine1,
    billing_address_line2: billingLine2,
    billing_city: billingCity,
    billing_state: billingState,
    billing_postal_code: billingPostal,
    billing_country: billingCountry,

    shipping_address_line1,
    shipping_address_line2: shipping_address_line2 ?? null,
    shipping_city,
    shipping_state: shipping_state ?? null,
    shipping_postal_code,
    shipping_country,

    shipping_method_id,
    shipping_method_name,
    shipping_cost,

    payment_method_id: payment_method_id ?? null,
    payment_method,
    payment_method_name: resolvedPaymentName,

    coupon_code,
    customer_notes: customer_notes ?? null,

    items: items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId ?? null,
      productName: i.productName,
      variantName: i.variantName ?? null,
      sku: i.sku ?? null,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      options: i.options ?? undefined,
      imageUrl: i.imageUrl ?? null,
    })),
  };

  const isCod =
    payment_method === "cash_on_delivery" ||
    payment_method.toLowerCase().includes("cod");

  const isStripe =
    payment_method === "stripe" ||
    payment_method.toLowerCase().includes("stripe");

  // ─── COD PIPELINE: SEND OTP EMAIL BEFORE CREATING DB ORDER ────────────────
  if (isCod) {
    try {
      const cleanEmail = customer_email.toLowerCase();

      // ── RATE LIMIT CHECK: Prevent constant OTP email spamming (60s cooldown) ──
      const existingRecord = await prisma.order_otp_verification.findFirst({
        where: { email: cleanEmail, type: "cod_confirmation" },
        orderBy: { created_at: "desc" },
      });

      if (existingRecord) {
        const timeSinceCreatedMs = Date.now() - existingRecord.created_at.getTime();
        const cooldownMs = 60 * 1000; // 60 seconds

        if (timeSinceCreatedMs < cooldownMs && existingRecord.expires_at > new Date()) {
          const secondsLeft = Math.ceil((cooldownMs - timeSinceCreatedMs) / 1000);
          return {
            success: true,
            requiresOtp: true,
            verificationId: existingRecord.id,
            email: customer_email,
            message: `A verification code was recently sent. Please wait ${secondsLeft}s before requesting a new email.`,
          };
        }
      }

      // Past 60s cooldown: Atomic transaction cleans up prior & expired OTPs, then creates fresh record
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const otpRecord = await createCodOtpTransaction({
        email: customer_email,
        otp_code: otpCode,
        order_payload: checkoutInputPayload,
        expires_at: expiresAt,
      });

      const customerName = `${customer_first_name} ${customer_last_name}`.trim();
      const emailResult = await sendCodOtpEmail({
        toEmail: customer_email,
        customerName,
        otpCode,
        expiresMinutes: 10,
      });

      if (!emailResult.success) {
        console.error("[placeOrder] Email dispatch failed:", emailResult.error);
        return {
          success: false,
          message: `Failed to send verification email: ${emailResult.error || "Please verify your SMTP configuration in environment variables."}`,
        };
      }

      return {
        success: true,
        requiresOtp: true,
        verificationId: otpRecord.id,
        email: customer_email,
        message: `An OTP verification code has been sent to ${customer_email}. Please verify to complete your order.`,
      };
    } catch (error: any) {
      console.error("[placeOrder] COD OTP Generation Error:", error);
      return {
        success: false,
        message: error?.message || "Failed to send verification code. Please check your email and try again.",
      };
    }
  }

  // ─── STRIPE PIPELINE: CREATE ORDER + GENERATE STRIPE CHECKOUT SESSION ────
  if (isStripe) {
    if (!isStripeConfigured()) {
      return {
        success: false,
        message:
          "Stripe payment gateway is currently unavailable. Please choose another payment method or contact support.",
      };
    }

    try {
      const order = await processCheckoutTransaction(checkoutInputPayload);

      const siteConfig = await getSiteConfig();
      const siteUrl =
        siteConfig?.site_url ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        "http://localhost:3000";

      const session = await createStripeCheckoutSession({
        orderNumber: order.order_number,
        customerEmail: customer_email,
        totalAmount: Number(order.total),
        currency: order.currency || "USD",
        items: checkoutInputPayload.items.map((i) => ({
          productName: i.productName,
          variantName: i.variantName,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          imageUrl: i.imageUrl,
        })),
        siteUrl,
      });

      return {
        success: true,
        message: "Redirecting to Stripe payment portal...",
        orderNumber: order.order_number,
        checkoutUrl: session.url || undefined,
      };
    } catch (error: any) {
      console.error("[placeOrder Stripe Error]", error);
      return {
        success: false,
        message:
          error?.message ||
          "Failed to create Stripe payment session. Please try again.",
      };
    }
  }

  // ─── NON-COD / NON-STRIPE DEFAULT PIPELINE ─────────────────────────────────
  try {
    const order = await processCheckoutTransaction(checkoutInputPayload);

    // Dispatch emails asynchronously in background without blocking action response
    sendInvoiceAndOrderEmailsForOrder(order.id, 0).catch((emailErr) => {
      console.error("[placeOrder] Non-fatal email/invoice generation error:", emailErr);
    });

    return {
      success: true,
      message: "Order placed successfully.",
      orderNumber: order.order_number,
    };
  } catch (error: any) {
    return handleCheckoutError(error);
  }
}

/**
 * Public action: Verifies COD OTP code and executes processCheckoutTransaction.
 */
export async function verifyCodOtpAndPlaceOrder(params: {
  verificationId: number;
  otpCode: string;
}): Promise<PlaceOrderResponse> {
  const { verificationId, otpCode } = params;

  if (!verificationId || !otpCode || !otpCode.trim()) {
    return {
      success: false,
      message: "Please enter the 6-digit verification code sent to your email.",
    };
  }

  const cleanOtp = otpCode.trim();

  const otpRecord = await prisma.order_otp_verification.findUnique({
    where: { id: verificationId },
  });

  if (!otpRecord) {
    return {
      success: false,
      message: "Verification session expired or not found. Please submit checkout again.",
    };
  }

  if (new Date() > otpRecord.expires_at) {
    try {
      await deleteCodOtpTransaction(verificationId);
    } catch {}
    return {
      success: false,
      message: "Verification code has expired. Please request a new code.",
    };
  }

  if (otpRecord.attempts >= 5) {
    try {
      await deleteCodOtpTransaction(verificationId);
    } catch {}
    return {
      success: false,
      message: "Too many failed verification attempts. Please re-submit your order.",
    };
  }

  if (otpRecord.otp_code !== cleanOtp) {
    await incrementCodOtpAttemptTransaction(verificationId);
    const remaining = 4 - otpRecord.attempts;
    return {
      success: false,
      message: `Invalid verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : ""}`,
    };
  }

  // OTP verified successfully! Create order in DB using stored payload
  try {
    const storedPayload = otpRecord.order_payload as unknown as ProcessCheckoutInput;
    const order = await processCheckoutTransaction(storedPayload);

    // Dispatch emails asynchronously in background without blocking action response
    sendInvoiceAndOrderEmailsForOrder(order.id, 0).catch((emailErr) => {
      console.error("[verifyCodOtpAndPlaceOrder] Non-fatal email error:", emailErr);
    });

    // Clean up used OTP record immediately upon order creation via transaction
    try {
      await deleteCodOtpTransaction(verificationId);
    } catch {}

    return {
      success: true,
      message: "Order verified and placed successfully!",
      orderNumber: order.order_number,
    };
  } catch (error: any) {
    return handleCheckoutError(error);
  }
}

/**
 * Public action: Resends a fresh COD OTP code with 60s rate limit enforcement.
 */
export async function resendCodOtp(params: {
  verificationId: number;
}): Promise<{ success: boolean; message: string; newVerificationId?: number }> {
  const { verificationId } = params;

  const otpRecord = await prisma.order_otp_verification.findUnique({
    where: { id: verificationId },
  });

  if (!otpRecord) {
    return {
      success: false,
      message: "Verification session expired. Please re-submit checkout.",
    };
  }

  // 60-second rate limit check on resending emails
  const timeSinceLastSendMs = Date.now() - otpRecord.updated_at.getTime();
  const cooldownMs = 60 * 1000;
  if (timeSinceLastSendMs < cooldownMs) {
    const secondsLeft = Math.ceil((cooldownMs - timeSinceLastSendMs) / 1000);
    return {
      success: false,
      message: `Please wait ${secondsLeft}s before requesting another verification email.`,
    };
  }

  try {
    const newOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const payload = otpRecord.order_payload as unknown as ProcessCheckoutInput;

    const freshRecord = await createCodOtpTransaction({
      email: otpRecord.email,
      otp_code: newOtpCode,
      order_payload: payload,
      expires_at: newExpiresAt,
    });

    const customerName = `${payload.customer_first_name} ${payload.customer_last_name}`.trim();
    const emailResult = await sendCodOtpEmail({
      toEmail: otpRecord.email,
      customerName,
      otpCode: newOtpCode,
      expiresMinutes: 10,
    });

    if (!emailResult.success) {
      return {
        success: false,
        message: `Failed to send email: ${emailResult.error || "Please check SMTP setup."}`,
      };
    }

    return {
      success: true,
      message: "A fresh verification code has been sent to your email.",
      newVerificationId: freshRecord.id,
    };
  } catch (error: any) {
    console.error("[resendCodOtp] Error:", error);
    return {
      success: false,
      message: "Failed to resend verification code. Please try again.",
    };
  }
}

function handleCheckoutError(error: any): PlaceOrderResponse {
  if (typeof error?.message === "string") {
    if (error.message.startsWith("OUT_OF_STOCK:")) {
      return {
        success: false,
        message:
          "One or more items in your cart are currently out of stock or requested quantity is unavailable.",
      };
    }
    if (error.message === "COUPON_INVALID") {
      return {
        success: false,
        errors: { coupon_code: "Coupon code is invalid or expired" },
        message: "Invalid coupon code.",
      };
    }
    if (error.message.startsWith("COUPON_MIN_NOT_MET:")) {
      const minAmt = error.message.split(":")[1];
      return {
        success: false,
        errors: {
          coupon_code: `Minimum order amount for this coupon is $${minAmt}`,
        },
        message: "Coupon minimum not met.",
      };
    }
    if (error.message === "COUPON_ALREADY_USED") {
      return {
        success: false,
        errors: { coupon_code: "You have already used this coupon" },
        message: "Coupon already used.",
      };
    }
  }
  console.error("[placeOrder/verifyCodOtp] Failed:", error);
  return {
    success: false,
    message: "Failed to place order. Please try again.",
  };
}
