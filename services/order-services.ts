import { Prisma } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";

/** Admin: paginated order list with summary fields. */
export async function getOrdersFromDB(filters?: {
  payment_status?: string;
  fulfillment_status?: string;
  customer_email?: string;
}) {
  return await prisma.order.findMany({
    where: {
      deleted_at: null,
      ...(filters?.payment_status && {
        payment_status: filters.payment_status,
      }),
      ...(filters?.fulfillment_status && {
        fulfillment_status: filters.fulfillment_status,
      }),
      ...(filters?.customer_email && {
        customer_email: filters.customer_email,
      }),
    },
    select: {
      id: true,
      order_number: true,
      customer_email: true,
      customer_first_name: true,
      customer_last_name: true,
      total: true,
      currency: true,
      payment_status: true,
      fulfillment_status: true,
      payment_method: true,
      placed_at: true,
    },
    orderBy: { placed_at: "desc" },
  });
}

/** Admin: full order detail by order number (also used in email/confirmation flows). */
export async function getOrderByNumberFromDB(orderNumber: string) {
  return await prisma.order.findUnique({
    where: { order_number: orderNumber, deleted_at: null },
    include: {
      items: true,
      payments: { orderBy: { created_at: "desc" } },
      refunds: { orderBy: { created_at: "desc" } },
      shipping_method: { select: { id: true, name: true } },
      coupon: { select: { id: true, code: true } },
    },
  });
}

/** Admin: soft-deleted orders. */
export async function getDeletedOrdersFromDB() {
  return await prisma.order.findMany({
    where: { deleted_at: { not: null } },
    select: {
      id: true,
      order_number: true,
      customer_email: true,
      total: true,
      deleted_at: true,
      deleted_by: true,
    },
    orderBy: { deleted_at: "desc" },
  });
}

export async function createOrderInDB(data: {
  order_number: string;
  customer_email: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone?: string | null;
  customer_ip?: string | null;
  customer_user_agent?: string | null;
  billing_address_line1: string;
  billing_address_line2?: string | null;
  billing_city: string;
  billing_state?: string | null;
  billing_postal_code: string;
  billing_country: string;
  shipping_address_line1: string;
  shipping_address_line2?: string | null;
  shipping_city: string;
  shipping_state?: string | null;
  shipping_postal_code: string;
  shipping_country: string;
  shipping_method_id?: number | null;
  shipping_method_name: string;
  shipping_cost: number;
  coupon_id?: number | null;
  coupon_code?: string | null;
  discount_amount?: number;
  subtotal: number;
  tax_amount?: number;
  total: number;
  currency?: string;
  payment_method: string;
  customer_notes?: string | null;
  created_by: number;
  updated_by: number;
  items: {
    product_id?: number | null;
    variant_id?: number | null;
    product_name: string;
    variant_name?: string | null;
    sku?: string | null;
    unit_price: number;
    quantity: number;
    line_total: number;
    options?: Record<string, string> | null;
    image_url?: string | null;
  }[];
}) {
  const { items, ...orderData } = data;
  return await prisma.order.create({
    data: {
      ...orderData,
      items: {
        createMany: {
          data: items.map((item) => ({
            ...item,
            options: item.options ?? Prisma.JsonNull,
          })),
        },
      },
    },
    include: { items: true },
  });
}

export async function updateOrderInDB(
  id: number,
  data: {
    payment_status?: string;
    fulfillment_status?: string;
    tracking_number?: string | null;
    tracking_url?: string | null;
    carrier_name?: string | null;
    shipped_at?: Date | null;
    delivered_at?: Date | null;
    paid_at?: Date | null;
    cancelled_at?: Date | null;
    admin_notes?: string | null;
    customer_notes?: string | null;
    confirmation_sent_at?: Date | null;
    shipping_notified_at?: Date | null;
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
) {
  return await prisma.order.update({ where: { id }, data });
}

export async function deleteOrderPermanentlyInDB(id: number) {
  return await prisma.order.delete({ where: { id } });
}

export async function getCouponUsageCountInDB(couponId: number, customerEmail: string) {
  return await prisma.order.count({
    where: {
      coupon_id: couponId,
      customer_email: customerEmail.toLowerCase(),
      deleted_at: null,
    },
  });
}

export interface CheckoutOrderItemInput {
  product_id?: number | null;
  variant_id?: number | null;
  product_name: string;
  variant_name?: string | null;
  sku?: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  options?: Record<string, string> | null;
  image_url?: string | null;
}

export interface CheckoutOrderDataInput {
  order_number: string;
  customer_email: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone?: string | null;
  customer_ip?: string | null;
  customer_user_agent?: string | null;

  billing_address_line1: string;
  billing_address_line2?: string | null;
  billing_city: string;
  billing_state?: string | null;
  billing_postal_code: string;
  billing_country: string;

  shipping_address_line1: string;
  shipping_address_line2?: string | null;
  shipping_city: string;
  shipping_state?: string | null;
  shipping_postal_code: string;
  shipping_country: string;

  shipping_method_id?: number | null;
  shipping_method_name: string;
  shipping_cost: number;

  coupon_id?: number | null;
  coupon_code?: string | null;
  discount_amount?: number;

  subtotal: number;
  tax_amount?: number;
  total: number;
  currency?: string;

  payment_method_id?: number | null;
  payment_method: string;
  payment_method_name: string;
  payment_status?: string;
  fulfillment_status?: string;

  customer_notes?: string | null;
  created_by?: number;
  updated_by?: number;

  items: {
    createMany: {
      data: CheckoutOrderItemInput[];
    };
  };
  payments?: {
    create: {
      provider: string;
      amount: number;
      currency?: string;
      status?: string;
    };
  };
}

export async function createCheckoutOrderTransactionInDB(
  orderData: CheckoutOrderDataInput,
  couponId?: number | null,
  rawItems?: { productId: number; variantId?: number | null; quantity: number }[]
) {
  return await prisma.$transaction(async (tx) => {
    if (rawItems && rawItems.length > 0) {
      for (const item of rawItems) {
        if (item.variantId) {
          const variant = await tx.product_variant.findUnique({
            where: { id: item.variantId },
            select: {
              stock_quantity: true,
              product: { select: { track_inventory: true } },
            },
          });
          if (variant && variant.product.track_inventory) {
            if (variant.stock_quantity < item.quantity) {
              throw new Error(`OUT_OF_STOCK:${item.variantId}`);
            }
            await tx.product_variant.update({
              where: { id: item.variantId },
              data: { stock_quantity: { decrement: item.quantity } },
            });
          }
        } else if (item.productId) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock_quantity: true, track_inventory: true },
          });
          if (product && product.track_inventory) {
            if (product.stock_quantity < item.quantity) {
              throw new Error(`OUT_OF_STOCK:${item.productId}`);
            }
            await tx.product.update({
              where: { id: item.productId },
              data: { stock_quantity: { decrement: item.quantity } },
            });
          }
        }
      }
    }

    let createdOrder;
    try {
      createdOrder = await tx.order.create({
        data: orderData as any,
        select: { id: true, order_number: true, total: true },
      });
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        // Regenerate unique order number if P2002 collision
        const cryptoString =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID().slice(0, 6).toUpperCase()
            : Math.random().toString(36).substring(2, 8).toUpperCase();
        const dateString = new Date()
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, "");
        const newOrderNumber = `ORD-${dateString}-${cryptoString}`;
        createdOrder = await tx.order.create({
          data: { ...orderData, order_number: newOrderNumber } as any,
          select: { id: true, order_number: true, total: true },
        });
      } else {
        throw err;
      }
    }

    if (couponId) {
      await tx.coupon.update({
        where: { id: couponId },
        data: { times_used: { increment: 1 } },
      });
    }

    return createdOrder;
  });
}
