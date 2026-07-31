import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

// ─── INVOICE NUMBER GENERATOR ──────────────────────────────────────────────────

function generateInvoiceNumber(orderNumber: string): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const cleanOrderRef = orderNumber.replace(/^ORD-/, "").slice(-6);
  return `INV-${y}${m}${d}-${cleanOrderRef}`;
}

export async function generateInvoiceForOrderInDB(
  orderId: number,
  createdBy: number = 0,
) {
  const existing = await prisma.invoice.findUnique({
    where: { order_id: orderId },
  });
  if (existing) {
    return existing;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error(`Order with ID ${orderId} not found.`);
  }

  const customerName =
    `${order.customer_first_name} ${order.customer_last_name}`.trim();
  const invoiceNumber = generateInvoiceNumber(order.order_number);

  const billingAddress = {
    line1: order.billing_address_line1,
    line2: order.billing_address_line2,
    city: order.billing_city,
    state: order.billing_state,
    postal_code: order.billing_postal_code,
    country: order.billing_country,
  };

  const shippingAddress = {
    line1: order.shipping_address_line1,
    line2: order.shipping_address_line2,
    city: order.shipping_city,
    state: order.shipping_state,
    postal_code: order.shipping_postal_code,
    country: order.shipping_country,
  };

  const isPaid = order.payment_status === "paid";

  return await prisma.invoice.create({
    data: {
      invoice_number: invoiceNumber,
      order_id: order.id,
      status: isPaid ? "paid" : "issued",
      customer_name: customerName,
      customer_email: order.customer_email,
      billing_address: billingAddress,
      shipping_address: shippingAddress,
      subtotal: order.subtotal,
      tax_amount: order.tax_amount,
      shipping_cost: order.shipping_cost,
      discount_amount: order.discount_amount,
      total: order.total,
      currency: order.currency,
      issued_at: new Date(),
      paid_at: isPaid ? order.paid_at || new Date() : null,
      created_by: createdBy,
      updated_by: createdBy,
    },
  });
}

export async function createInvoiceInDB(data: {
  order_id: number;
  status?: string;
  customer_name: string;
  customer_email: string;
  billing_address?: any;
  shipping_address?: any;
  subtotal: number | any;
  tax_amount?: number | any;
  shipping_cost?: number | any;
  discount_amount?: number | any;
  total: number | any;
  currency?: string;
  issued_at?: Date;
  paid_at?: Date | null;
  due_at?: Date | null;
  notes?: string | null;
  created_by: number;
  updated_by: number;
}) {
  const order = await prisma.order.findUnique({
    where: { id: data.order_id },
    select: { order_number: true },
  });
  const invoiceNumber = generateInvoiceNumber(
    order?.order_number || `ORD-${data.order_id}`,
  );

  return await prisma.invoice.create({
    data: {
      ...data,
      invoice_number: invoiceNumber,
    },
  });
}

export async function updateInvoiceInDB(
  id: number,
  data: {
    status?: string;
    customer_name?: string;
    customer_email?: string;
    billing_address?: any;
    shipping_address?: any;
    subtotal?: number | any;
    tax_amount?: number | any;
    shipping_cost?: number | any;
    discount_amount?: number | any;
    total?: number | any;
    currency?: string;
    paid_at?: Date | null;
    due_at?: Date | null;
    notes?: string | null;
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
) {
  return await prisma.invoice.update({
    where: { id },
    data,
  });
}

export async function deleteInvoicePermanentlyInDB(id: number) {
  return await prisma.invoice.delete({
    where: { id },
  });
}

export async function bulkUpdateInvoicesInDB(
  ids: number[],
  data: {
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
  selectAllScope: boolean = false,
  isTrash: boolean = false,
  filterWhere?: Prisma.invoiceWhereInput,
) {
  let whereCondition: any;

  if (selectAllScope) {
    if (filterWhere) {
      whereCondition = filterWhere;
    } else if (isTrash) {
      whereCondition = { NOT: { deleted_at: null } };
    } else {
      whereCondition = { deleted_at: null };
    }
  } else {
    whereCondition = { id: { in: ids } };
  }

  return await prisma.invoice.updateMany({
    where: whereCondition,
    data,
  });
}

export async function bulkDeleteInvoicesPermanentlyInDB(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.invoiceWhereInput,
) {
  let whereCondition: any;

  if (selectAllScope) {
    if (filterWhere) {
      whereCondition = filterWhere;
    } else {
      whereCondition = { NOT: { deleted_at: null } };
    }
  } else {
    whereCondition = { id: { in: ids } };
  }

  return await prisma.invoice.deleteMany({
    where: whereCondition,
  });
}
