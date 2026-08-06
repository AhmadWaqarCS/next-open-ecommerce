import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

export interface ProcessCheckoutItemInput {
  productId: number;
  variantId?: number | null;
  productName: string;
  variantName?: string | null;
  sku?: string | null;
  unitPrice: number;
  quantity: number;
  options?: Record<string, string>;
  imageUrl?: string | null;
}

export interface ProcessCheckoutInput {
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

  payment_method_id?: number | null;
  payment_method: string;
  payment_method_name: string;

  coupon_code?: string | null;
  customer_notes?: string | null;

  items: ProcessCheckoutItemInput[];
}

function generateOrderNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ORD-${y}${m}${d}-${suffix}`;
}

export async function processCheckoutTransaction(input: ProcessCheckoutInput) {
  return await prisma.$transaction(async (tx) => {
    const now = new Date();
    const subtotal = input.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    let couponId: number | null = null;
    let couponCodeSnapshot: string | null = null;
    let discountAmount = 0;

    if (input.coupon_code && input.coupon_code.trim()) {
      const cleanCode = input.coupon_code.trim().toUpperCase();
      const coupon = await tx.coupon.findFirst({
        where: {
          code: cleanCode,
          is_active: true,
          deleted_at: null,
          starts_at: { lte: now },
          OR: [{ expires_at: null }, { expires_at: { gte: now } }],
        },
      });

      if (!coupon) {
        throw new Error("COUPON_INVALID");
      }

      if (coupon.max_uses !== null && coupon.times_used >= coupon.max_uses) {
        throw new Error("COUPON_MAX_USES_REACHED");
      }

      if (
        coupon.minimum_order_amount !== null &&
        subtotal < Number(coupon.minimum_order_amount)
      ) {
        throw new Error(`COUPON_MIN_NOT_MET:${Number(coupon.minimum_order_amount).toFixed(2)}`);
      }

      if (coupon.max_uses_per_email > 0) {
        const usageCount = await tx.order.count({
          where: {
            coupon_id: coupon.id,
            customer_email: input.customer_email.toLowerCase(),
            deleted_at: null,
            cancelled_at: null,
          },
        });
        if (usageCount >= coupon.max_uses_per_email) {
          throw new Error("COUPON_ALREADY_USED");
        }
      }

      if (coupon.discount_type === "percentage") {
        discountAmount = (subtotal * Number(coupon.discount_value)) / 100;
      } else {
        discountAmount = Math.min(subtotal, Number(coupon.discount_value));
      }

      couponId = coupon.id;
      couponCodeSnapshot = coupon.code;
    }

    const siteConfigRow = await tx.site_config.findFirst({
      where: { deleted_at: null },
      select: {
        currency: true,
        tax_rate: true,
        tax_inclusive: true,
      },
    });

    const currency = siteConfigRow?.currency || "USD";
    const taxRate = siteConfigRow?.tax_rate ? Number(siteConfigRow.tax_rate) : 0;

    let taxAmount = 0;
    if (taxRate > 0) {
      if (siteConfigRow?.tax_inclusive) {
        taxAmount = subtotal - subtotal / (1 + taxRate);
      } else {
        taxAmount = subtotal * taxRate;
      }
      taxAmount = Math.round(taxAmount * 100) / 100;
    }

    const total = siteConfigRow?.tax_inclusive
      ? Math.max(
          0,
          Math.round((subtotal + input.shipping_cost - discountAmount) * 100) / 100,
        )
      : Math.max(
          0,
          Math.round(
            (subtotal + input.shipping_cost + taxAmount - discountAmount) * 100,
          ) / 100,
        );

    // Stock decrement checks
    for (const item of input.items) {
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

    const orderNumber = generateOrderNumber();

    const createdOrder = await tx.order.create({
      data: {
        order_number: orderNumber,
        customer_email: input.customer_email.toLowerCase(),
        customer_first_name: input.customer_first_name,
        customer_last_name: input.customer_last_name,
        customer_phone: input.customer_phone ?? null,
        customer_ip: input.customer_ip ?? null,
        customer_user_agent: input.customer_user_agent ?? null,

        billing_address_line1: input.billing_address_line1,
        billing_address_line2: input.billing_address_line2 ?? null,
        billing_city: input.billing_city,
        billing_state: input.billing_state ?? null,
        billing_postal_code: input.billing_postal_code,
        billing_country: input.billing_country,

        shipping_address_line1: input.shipping_address_line1,
        shipping_address_line2: input.shipping_address_line2 ?? null,
        shipping_city: input.shipping_city,
        shipping_state: input.shipping_state ?? null,
        shipping_postal_code: input.shipping_postal_code,
        shipping_country: input.shipping_country,

        shipping_method_id: input.shipping_method_id ?? null,
        shipping_method_name: input.shipping_method_name,
        shipping_cost: input.shipping_cost,

        coupon_id: couponId,
        coupon_code: couponCodeSnapshot,
        discount_amount: discountAmount,

        subtotal,
        tax_amount: taxAmount,
        total,
        currency,

        payment_method_id: input.payment_method_id ?? null,
        payment_method: input.payment_method,
        payment_method_name: input.payment_method_name,
        payment_status:
          input.payment_method === "cash_on_delivery"
            ? "cod_pending"
            : "pending",
        fulfillment_status: "unfulfilled",

        customer_notes: input.customer_notes ?? null,

        created_by: 0,
        updated_by: 0,

        items: {
          createMany: {
            data: input.items.map((item) => ({
              product_id: item.productId,
              variant_id: item.variantId ?? null,
              product_name: item.productName,
              variant_name: item.variantName ?? null,
              sku: item.sku ?? null,
              unit_price: item.unitPrice,
              quantity: item.quantity,
              line_total: item.unitPrice * item.quantity,
              options: (item.options as any) ?? Prisma.JsonNull,
              image_url: item.imageUrl ?? null,
            })),
          },
        },
        payments: {
          create: {
            provider:
              input.payment_method === "cash_on_delivery"
                ? "cod"
                : input.payment_method,
            amount: total,
            currency,
            status: "pending",
          },
        },
      },
      select: { id: true, order_number: true, total: true, currency: true },
    });

    if (couponId) {
      await tx.coupon.update({
        where: { id: couponId },
        data: { times_used: { increment: 1 } },
      });
    }

    return createdOrder;
  });
}

export async function updateOrderTransaction(
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
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id } });
    if (!existing) throw new Error("Order not found.");

    if (existing.cancelled_at || existing.fulfillment_status === "cancelled") {
      throw new Error("ORDER_CANCELLED_CANNOT_BE_EDITED");
    }

    const updated = await tx.order.update({
      where: { id },
      data: { ...data, updated_by: userId },
    });

    return { existing, updated };
  });
}

export async function deleteOrderTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id } });
    if (!existing) throw new Error("Order not found.");

    const updated = await tx.order.update({
      where: { id },
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });

    return { existing, updated };
  });
}

export async function restoreOrderTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id } });
    if (!existing) throw new Error("Order not found.");

    const updated = await tx.order.update({
      where: { id },
      data: { updated_by: userId, deleted_at: null, deleted_by: null },
    });

    return { existing, updated };
  });
}

export async function permanentlyDeleteOrderTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id } });
    if (!existing) throw new Error("Order not found.");

    await tx.order_item.deleteMany({ where: { order_id: id } });
    await tx.payment_transaction.deleteMany({ where: { order_id: id } });
    await tx.order_refund.deleteMany({ where: { order_id: id } });
    await tx.order.delete({ where: { id } });

    return { existing };
  });
}

export async function bulkDeleteOrdersTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.orderWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.orderWhereInput = selectAllScope
      ? (filterWhere ?? { deleted_at: null })
      : { id: { in: ids } };

    return await tx.order.updateMany({
      where: whereCondition,
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });
  });
}

export async function bulkRestoreOrdersTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.orderWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.orderWhereInput = selectAllScope
      ? (filterWhere ?? { NOT: { deleted_at: null } })
      : { id: { in: ids } };

    return await tx.order.updateMany({
      where: whereCondition,
      data: { updated_by: userId, deleted_at: null, deleted_by: null },
    });
  });
}

export async function bulkPermanentlyDeleteOrdersTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.orderWhereInput,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.orderWhereInput = selectAllScope
      ? (filterWhere ?? { NOT: { deleted_at: null } })
      : { id: { in: ids } };

    const affected = await tx.order.findMany({
      where: whereCondition,
      select: { id: true },
    });
    const affectedIds = affected.map((o) => o.id);

    if (affectedIds.length > 0) {
      await tx.order_item.deleteMany({ where: { order_id: { in: affectedIds } } });
      await tx.payment_transaction.deleteMany({ where: { order_id: { in: affectedIds } } });
      await tx.order_refund.deleteMany({ where: { order_id: { in: affectedIds } } });
      await tx.order.deleteMany({ where: { id: { in: affectedIds } } });
    }

    return { affected };
  });
}

export async function getOrdersDashboardDataInDB(
  whereCondition: Prisma.orderWhereInput,
  skipCount: number,
  pageSize: number,
) {
  return await prisma.$transaction(async (tx) => {
    const ordersRaw = await tx.order.findMany({
      where: whereCondition,
      include: {
        items: {
          select: { id: true, product_name: true, variant_name: true, quantity: true, unit_price: true },
        },
      },
      take: pageSize,
      skip: skipCount,
      orderBy: { placed_at: "desc" },
    });

    const totalOrders = await tx.order.count({ where: whereCondition });

    const dashboardUsers = await tx.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    const paymentMethodsRaw = await tx.payment_method.findMany({
      where: { deleted_at: null },
      select: { provider: true, name: true },
      orderBy: { sort_order: "asc" },
    });

    return { ordersRaw, totalOrders, dashboardUsers, paymentMethodsRaw };
  });
}

export async function getOrderDetailsDataInDB(orderId: number) {
  return await prisma.order.findFirst({
    where: { id: orderId, deleted_at: null },
    include: {
      items: {
        orderBy: { id: "asc" },
      },
      shipping_method: {
        select: { id: true, name: true, price: true },
      },
      coupon: {
        select: {
          id: true,
          code: true,
          discount_type: true,
          discount_value: true,
        },
      },
      payment_method_ref: {
        select: { id: true, name: true, provider: true },
      },
    },
  });
}

// ─── UNIFIED UNIFIED OTP & ORDER CANCELLATION DB TRANSACTIONS ──────────────────

export async function createCodOtpTransaction(data: {
  email: string;
  otp_code: string;
  order_payload: any;
  expires_at: Date;
}) {
  return await prisma.$transaction(async (tx) => {
    const cleanEmail = data.email.toLowerCase();

    // Clean up any old pending OTPs for this email and expired OTPs system-wide
    await tx.order_otp_verification.deleteMany({
      where: {
        OR: [
          { email: cleanEmail, type: "cod_confirmation" },
          { expires_at: { lte: new Date() } },
        ],
      },
    });

    return await tx.order_otp_verification.create({
      data: {
        type: "cod_confirmation",
        email: cleanEmail,
        otp_code: data.otp_code,
        order_payload: data.order_payload,
        expires_at: data.expires_at,
      },
    });
  });
}

export async function createCancellationOtpTransaction(data: {
  order_number: string;
  email: string;
  otp_code: string;
  expires_at: Date;
}) {
  return await prisma.$transaction(async (tx) => {
    const cleanEmail = data.email.toLowerCase();

    // Clean up any pending cancellation OTPs for this order number & email
    await tx.order_otp_verification.deleteMany({
      where: {
        OR: [
          { order_number: data.order_number, type: "order_cancellation" },
          { expires_at: { lte: new Date() } },
        ],
      },
    });

    return await tx.order_otp_verification.create({
      data: {
        type: "order_cancellation",
        order_number: data.order_number,
        email: cleanEmail,
        otp_code: data.otp_code,
        expires_at: data.expires_at,
      },
    });
  });
}

export async function incrementOtpAttemptTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    return await tx.order_otp_verification.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  });
}

export async function deleteOtpTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    return await tx.order_otp_verification.delete({
      where: { id },
    });
  });
}

// Retain legacy aliases for backwards compatibility with existing actions
export const incrementCodOtpAttemptTransaction = incrementOtpAttemptTransaction;
export const deleteCodOtpTransaction = deleteOtpTransaction;

export async function cancelOrderInDB(input: {
  order_number: string;
  email: string;
  reason?: string | null;
}) {
  return await prisma.$transaction(async (tx) => {
    const cleanEmail = input.email.trim().toLowerCase();
    const order = await tx.order.findFirst({
      where: {
        order_number: input.order_number.trim(),
        customer_email: { equals: cleanEmail, mode: "insensitive" },
        deleted_at: null,
      },
      include: {
        items: true,
        invoice: true,
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    if (order.cancelled_at || order.fulfillment_status === "cancelled") {
      throw new Error("ORDER_ALREADY_CANCELLED");
    }

    if (
      order.fulfillment_status === "shipped" ||
      order.fulfillment_status === "delivered"
    ) {
      throw new Error("ORDER_CANNOT_BE_CANCELLED_SHIPPED");
    }

    const now = new Date();

    // 1. Update order record
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        cancelled_at: now,
        fulfillment_status: "cancelled",
        payment_status:
          order.payment_status === "paid" ? "refund_pending" : "cancelled",
        admin_notes: input.reason
          ? `${order.admin_notes ? order.admin_notes + "\n" : ""}Customer cancellation reason: ${input.reason}`
          : order.admin_notes,
      },
    });

    // 2. Update related invoice status if exists
    if (order.invoice) {
      await tx.invoice.update({
        where: { id: order.invoice.id },
        data: { status: "cancelled" },
      });
    }

    // 3. Restore inventory stock for product & variants
    for (const item of order.items) {
      if (item.product_id) {
        const prod = await tx.product.findUnique({
          where: { id: item.product_id },
          select: { track_inventory: true },
        });

        if (prod?.track_inventory) {
          await tx.product.update({
            where: { id: item.product_id },
            data: {
              stock_quantity: { increment: item.quantity },
            },
          });
        }
      }

      if (item.variant_id) {
        await tx.product_variant.update({
          where: { id: item.variant_id },
          data: {
            stock_quantity: { increment: item.quantity },
          },
        });
      }
    }

    return updatedOrder;
  });
}




