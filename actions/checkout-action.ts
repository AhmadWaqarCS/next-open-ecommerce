"use server";

import { headers } from "next/headers";
import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import { checkoutFormSchema, CheckoutFormInput } from "@/lib/validations";
import prisma from "@/lib/prisma";
import { sendInvoiceAndOrderEmailsForOrder } from "@/services/email-services";
import { getCouponUsageCountInDB, createCheckoutOrderTransactionInDB } from "@/services/order-services";


export type PlaceOrderResponse = ActionResponse & {
  orderNumber?: string;
};

function generateOrderNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Unambiguous charset
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ORD-${y}${m}${d}-${suffix}`;
}

/**
 * Public (loginless) server action.
 * Creates: order + order_items[] + payment_transaction in a single transaction.
 * For COD: payment_method="cash_on_delivery", payment_status="cod_pending"
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

  let couponId: number | null = null;
  let couponCodeSnapshot: string | null = null;
  let discountAmount = 0;

  if (coupon_code && coupon_code.trim()) {
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: coupon_code.trim().toUpperCase(),
        is_active: true,
        deleted_at: null,
        starts_at: { lte: new Date() },
        OR: [{ expires_at: null }, { expires_at: { gte: new Date() } }],
      },
    });
    if (!coupon) {
      return {
        success: false,
        errors: { coupon_code: "Coupon code is invalid or expired" },
        message: "Invalid coupon code.",
      };
    }

    const subtotalForCoupon = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    if (
      coupon.minimum_order_amount !== null &&
      subtotalForCoupon < Number(coupon.minimum_order_amount)
    ) {
      return {
        success: false,
        errors: {
          coupon_code: `Minimum order amount for this coupon is $${Number(coupon.minimum_order_amount).toFixed(2)}`,
        },
        message: "Coupon minimum not met.",
      };
    }

    if (coupon.max_uses_per_email > 0) {
      const usageCount = await getCouponUsageCountInDB(coupon.id, customer_email);
      if (usageCount >= coupon.max_uses_per_email) {
        return {
          success: false,
          errors: { coupon_code: "You have already used this coupon" },
          message: "Coupon already used.",
        };
      }
    }

    if (coupon.discount_type === "percentage") {
      discountAmount = (subtotalForCoupon * Number(coupon.discount_value)) / 100;
    } else {
      discountAmount = Math.min(
        subtotalForCoupon,
        Number(coupon.discount_value),
      );
    }

    couponId = coupon.id;
    couponCodeSnapshot = coupon.code;
  }

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
  }

  const checkoutConfigRow = await prisma.site_config.findFirst({
    where: { deleted_at: null },
    select: {
      currency: true,
      currency_symbol: true,
      require_phone: true,
      allow_order_notes: true,
      tax_rate: true,
      tax_inclusive: true,
      tax_label: true,
    },
  });
  const checkoutConfig = checkoutConfigRow
    ? {
        ...checkoutConfigRow,
        tax_rate:
          checkoutConfigRow.tax_rate !== null
            ? Number(checkoutConfigRow.tax_rate)
            : null,
      }
    : null;
  const currency = checkoutConfig?.currency || "USD";

  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  let taxAmount = 0;
  if (checkoutConfig?.tax_rate && checkoutConfig.tax_rate > 0) {
    const taxRate = checkoutConfig.tax_rate;
    if (checkoutConfig.tax_inclusive) {
      taxAmount = subtotal - subtotal / (1 + taxRate);
    } else {
      taxAmount = subtotal * taxRate;
    }
    taxAmount = Math.round(taxAmount * 100) / 100;
  }

  const total = checkoutConfig?.tax_inclusive
    ? Math.max(0, Math.round((subtotal + shipping_cost - discountAmount) * 100) / 100)
    : Math.max(0, Math.round((subtotal + shipping_cost + taxAmount - discountAmount) * 100) / 100);

  const orderNumber = generateOrderNumber();

  const rawItems = items.map((i) => ({
    productId: i.productId,
    variantId: i.variantId ?? undefined,
    quantity: i.quantity,
  }));

  // 8. Create order in a Prisma transaction via service layer
  try {
    const orderData = {
      order_number: orderNumber,
      customer_email: customer_email.toLowerCase(),
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

      shipping_method_id: shipping_method_id,
      shipping_method_name,
      shipping_cost,

      coupon_id: couponId,
      coupon_code: couponCodeSnapshot,
      discount_amount: discountAmount,

      subtotal,
      tax_amount: taxAmount,
      total,
      currency,

      payment_method_id: payment_method_id ?? null,
      payment_method,
      payment_method_name: resolvedPaymentName,
      payment_status:
        payment_method === "cash_on_delivery" ? "cod_pending" : "pending",
      fulfillment_status: "unfulfilled",

      customer_notes: customer_notes ?? null,

      // Public storefront orders use 0 as the system user sentinel
      created_by: 0,
      updated_by: 0,

      items: {
        createMany: {
          data: items.map((item) => ({
            product_id: item.productId,
            variant_id: item.variantId ?? null,
            product_name: item.productName,
            variant_name: item.variantName ?? null,
            sku: item.sku ?? null,
            unit_price: item.unitPrice,
            quantity: item.quantity,
            line_total: item.unitPrice * item.quantity,
            options: item.options ?? undefined,
            image_url: item.imageUrl ?? null,
          })),
        },
      },
      payments: {
        create: {
          provider: payment_method === "cash_on_delivery" ? "cod" : payment_method,
          amount: total,
          currency,
          status: "pending",
        },
      },
    };

    const order = await createCheckoutOrderTransactionInDB(orderData, couponId, rawItems);

    // Generate invoice and send emails (non-blocking catch so checkout response stays instant)
    try {
      await sendInvoiceAndOrderEmailsForOrder(order.id, 0);
    } catch (emailErr) {
      console.error("[placeOrder] Non-fatal email/invoice generation error:", emailErr);
    }

    return {
      success: true,
      message: "Order placed successfully.",
      orderNumber: order.order_number,
    };
  } catch (error: any) {
    if (typeof error?.message === "string" && error.message.startsWith("OUT_OF_STOCK:")) {
      return {
        success: false,
        message: "One or more items in your cart are currently out of stock or requested quantity is unavailable.",
      };
    }
    console.error("[placeOrder] Failed:", error);
    return {
      success: false,
      message: "Failed to place order. Please try again.",
    };
  }
}
