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
    const order = await tx.order.findUnique({
      where: { id: data.order_id },
      select: { order_number: true },
    });
    const invoiceNumber = generateInvoiceNumber(
      order?.order_number || `ORD-${data.order_id}`,
    );

    return await tx.invoice.create({
      data: {
        ...data,
        invoice_number: invoiceNumber,
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

    const updated = await tx.invoice.update({
      where: { id },
      data: { ...data, updated_by: userId },
    });

    return { existing, updated };
  });
}

export async function deleteInvoiceTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findUnique({ where: { id } });
    if (!existing) throw new Error("Invoice not found.");

    await tx.invoice.update({
      where: { id },
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });

    return { existing };
  });
}

export async function restoreInvoiceTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findUnique({ where: { id } });
    if (!existing) throw new Error("Invoice not found.");

    await tx.invoice.update({
      where: { id },
      data: { updated_by: userId, deleted_at: null, deleted_by: null },
    });

    return { existing };
  });
}

export async function permanentlyDeleteInvoiceTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findUnique({ where: { id } });
    if (!existing) throw new Error("Invoice not found.");

    await tx.invoice.delete({ where: { id } });

    return { existing };
  });
}

export async function bulkDeleteInvoicesTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  isTrash: boolean = false,
  filterWhere?: Prisma.invoiceWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.invoiceWhereInput = selectAllScope
      ? (filterWhere ?? (isTrash ? { NOT: { deleted_at: null } } : { deleted_at: null }))
      : { id: { in: ids } };

    return await tx.invoice.updateMany({
      where: whereCondition,
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });
  });
}

export async function bulkRestoreInvoicesTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  isTrash: boolean = true,
  filterWhere?: Prisma.invoiceWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.invoiceWhereInput = selectAllScope
      ? (filterWhere ?? (isTrash ? { NOT: { deleted_at: null } } : { deleted_at: null }))
      : { id: { in: ids } };

    return await tx.invoice.updateMany({
      where: whereCondition,
      data: { updated_by: userId, deleted_at: null, deleted_by: null },
    });
  });
}

export async function bulkPermanentlyDeleteInvoicesTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.invoiceWhereInput,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.invoiceWhereInput = selectAllScope
      ? (filterWhere ?? { NOT: { deleted_at: null } })
      : { id: { in: ids } };

    return await tx.invoice.deleteMany({
      where: whereCondition,
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
    where: { deleted_at: null },
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
      where: { id: invoiceId, deleted_at: null },
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

    const siteConfig = await tx.site_config.findFirst({
      where: { deleted_at: null },
    });

    return { invoice, siteConfig };
  });
}

export async function getInvoiceEditDataInDB(invoiceId: number) {
  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId, deleted_at: null },
    });

    const ordersRaw = await tx.order.findMany({
      where: { deleted_at: null },
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

export async function getInvoiceTrashDashboardDataInDB(
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
      orderBy: { deleted_at: "desc" },
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

