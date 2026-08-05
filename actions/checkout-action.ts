"use server";

import { headers } from "next/headers";
import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import { checkoutFormSchema, CheckoutFormInput } from "@/lib/validations";
import { sendInvoiceAndOrderEmailsForOrder } from "@/services/email-services";
import { processCheckoutTransaction } from "@/services/order-services";

export type PlaceOrderResponse = ActionResponse & {
  orderNumber?: string;
};

/**
 * Public (loginless) server action.
 * Creates: order + order_items[] + payment_transaction in a single transaction via service layer.
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

  try {
    const order = await processCheckoutTransaction({
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
    });

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
    console.error("[placeOrder] Failed:", error);
    return {
      success: false,
      message: "Failed to place order. Please try again.",
    };
  }
}
