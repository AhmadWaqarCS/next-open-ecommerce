import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

function generateInvoiceNumber(orderNumber: string): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const cleanOrderRef = orderNumber.replace(/^ORD-/, "").slice(-6);
  return `INV-${y}${m}${d}-${cleanOrderRef}`;
}

export async function generateInvoiceForOrderTransaction(
  orderId: number,
  createdBy: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findUnique({
      where: { order_id: orderId },
    });
    if (existing) {
      return existing;
    }

    const order = await tx.order.findUnique({
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

    return await tx.invoice.create({
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
  });
}

export async function createInvoiceTransaction(
  data: {
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
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existingForOrder = await tx.invoice.findUnique({
      where: { order_id: data.order_id },
    });
    if (existingForOrder) {
      throw new Error(`An invoice already exists for Order #${data.order_id}.`);
    }

    const order = await tx.order.findUnique({
      where: { id: data.order_id },
      select: { order_number: true },
    });

    const invoiceNumber = generateInvoiceNumber(
      order?.order_number || `ORD-${data.order_id}`,
    );

    const isPaid = data.status === "paid";
    const computedPaidAt = data.paid_at !== undefined
      ? data.paid_at
      : (isPaid ? new Date() : null);

    return await tx.invoice.create({
      data: {
        ...data,
        invoice_number: invoiceNumber,
        paid_at: computedPaidAt,
        created_by: userId,
        updated_by: userId,
      },
    });
  });
}

export async function updateInvoiceTransaction(
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
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findUnique({ where: { id } });
    if (!existing) throw new Error("Invoice not found.");

    // Diff checking
    const updatePayload: Prisma.invoiceUpdateInput = {};

    if (data.status !== undefined && data.status !== existing.status) {
      updatePayload.status = data.status;
      if (data.status === "paid" && !existing.paid_at && data.paid_at === undefined) {
        updatePayload.paid_at = new Date();
      }
    }

    if (data.customer_name !== undefined && data.customer_name !== existing.customer_name) {
      updatePayload.customer_name = data.customer_name;
    }

    if (data.customer_email !== undefined && data.customer_email !== existing.customer_email) {
      updatePayload.customer_email = data.customer_email;
    }

    if (data.subtotal !== undefined && Number(data.subtotal) !== Number(existing.subtotal)) {
      updatePayload.subtotal = data.subtotal;
    }

    if (data.tax_amount !== undefined && Number(data.tax_amount) !== Number(existing.tax_amount)) {
      updatePayload.tax_amount = data.tax_amount;
    }

    if (data.shipping_cost !== undefined && Number(data.shipping_cost) !== Number(existing.shipping_cost)) {
      updatePayload.shipping_cost = data.shipping_cost;
    }

    if (data.discount_amount !== undefined && Number(data.discount_amount) !== Number(existing.discount_amount)) {
      updatePayload.discount_amount = data.discount_amount;
    }

    if (data.total !== undefined && Number(data.total) !== Number(existing.total)) {
      updatePayload.total = data.total;
    }

    if (data.currency !== undefined && data.currency !== existing.currency) {
      updatePayload.currency = data.currency;
    }

    if (data.notes !== undefined && data.notes !== existing.notes) {
      updatePayload.notes = data.notes;
    }

    if (data.due_at !== undefined) {
      updatePayload.due_at = data.due_at;
    }

    if (data.paid_at !== undefined) {
      updatePayload.paid_at = data.paid_at;
    }

    if (data.billing_address !== undefined) {
      updatePayload.billing_address = data.billing_address;
    }

    if (data.shipping_address !== undefined) {
      updatePayload.shipping_address = data.shipping_address;
    }

    updatePayload.updated_by = userId;

    const updated = await tx.invoice.update({
      where: { id },
      data: updatePayload,
    });

    return { existing, updated };
  });
}

export async function bulkUpdateInvoiceStatusTransaction(
  ids: number[],
  status: string,
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const isPaid = status === "paid";
    const updateData: Prisma.invoiceUpdateManyMutationInput = {
      status,
      updated_by: userId,
    };

    if (isPaid) {
      updateData.paid_at = new Date();
    }

    return await tx.invoice.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });
  });
}

export async function getInvoicesDashboardDataInDB(
  where: Prisma.invoiceWhereInput,
  skipCount: number,
  pageSize: number,
) {
  return await prisma.$transaction(async (tx) => {
    const invoicesRaw = await tx.invoice.findMany({
      where,
      include: {
        order: {
          select: { order_number: true },
        },
      },
      take: pageSize,
      skip: skipCount,
      orderBy: { created_at: "desc" },
    });

    const totalInvoices = await tx.invoice.count({ where });

    const dashboardUsers = await tx.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return { invoicesRaw, totalInvoices, dashboardUsers };
  });
}

export async function getInvoiceCreateDataInDB() {
  return await prisma.order.findMany({
    where: {
      invoice: null,
    },
    select: {
      id: true,
      order_number: true,
      customer_first_name: true,
      customer_last_name: true,
      customer_email: true,
      subtotal: true,
      tax_amount: true,
      shipping_cost: true,
      discount_amount: true,
      total: true,
      currency: true,
    },
    orderBy: { placed_at: "desc" },
    take: 50,
  });
}

export async function getInvoiceDetailsDataInDB(invoiceId: number) {
  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: {
          include: {
            items: true,
          },
        },
        sent_emails: {
          orderBy: { sent_at: "desc" },
        },
      },
    });

    const siteConfig = await tx.site_config.findFirst();

    return { invoice, siteConfig };
  });
}

export async function getInvoiceEditDataInDB(invoiceId: number) {
  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
    });

    const ordersRaw = await tx.order.findMany({
      select: {
        id: true,
        order_number: true,
        customer_first_name: true,
        customer_last_name: true,
        customer_email: true,
        subtotal: true,
        tax_amount: true,
        shipping_cost: true,
        discount_amount: true,
        total: true,
        currency: true,
      },
      orderBy: { placed_at: "desc" },
      take: 50,
    });

    return { invoice, ordersRaw };
  });
}
