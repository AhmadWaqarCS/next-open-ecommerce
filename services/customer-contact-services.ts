import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

export interface UpsertContactOptions {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  is_customer?: boolean;
  is_newsletter?: boolean;
  city?: string | null;
  country?: string | null;
}

export async function upsertCustomerContactInDB(options: UpsertContactOptions) {
  const normalizedEmail = options.email.trim().toLowerCase();

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.customer_contact.findUnique({
      where: { email: normalizedEmail },
    });

    // Reset unsubscribed if user places another successful order or resubscribes
    const isUnsubscribed = existing
      ? (options.is_customer || options.is_newsletter ? false : existing.is_unsubscribed)
      : false;

    // Fetch past orders to compute analytical aggregations
    const orders = await tx.order.findMany({
      where: {
        customer_email: normalizedEmail,
        deleted_at: null,
      },
      include: {
        items: true,
      },
    });

    let totalSpent = new Prisma.Decimal(0);
    let totalOrders = orders.length;
    let totalQuantity = 0;
    const categorySet = new Set<string>();
    const locationSet = new Set<string>();

    for (const order of orders) {
      totalSpent = totalSpent.add(order.total);
      for (const item of order.items) {
        totalQuantity += item.quantity;
      }
      if (order.shipping_city && order.shipping_country) {
        locationSet.add(`${order.shipping_city}, ${order.shipping_country}`);
      }
    }

    // Fetch product category names for purchased products
    const productIds = orders
      .flatMap((o) => o.items.map((i) => i.product_id))
      .filter((id): id is number => id !== null);

    if (productIds.length > 0) {
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { category_name: true },
      });
      for (const p of products) {
        if (p.category_name) categorySet.add(p.category_name);
      }
    }

    const categoriesBought = Array.from(categorySet);
    const locations = Array.from(locationSet);

    if (existing) {
      return await tx.customer_contact.update({
        where: { id: existing.id },
        data: {
          first_name: options.first_name ?? existing.first_name,
          last_name: options.last_name ?? existing.last_name,
          phone: options.phone ?? existing.phone,
          is_customer: options.is_customer !== undefined ? (existing.is_customer || options.is_customer) : existing.is_customer,
          is_newsletter: options.is_newsletter !== undefined ? (existing.is_newsletter || options.is_newsletter) : existing.is_newsletter,
          is_unsubscribed: isUnsubscribed,
          unsubscribed_at: isUnsubscribed ? existing.unsubscribed_at : null,
          total_spent: totalSpent,
          total_orders: totalOrders,
          total_quantity: totalQuantity,
          categories_bought: categoriesBought,
          locations: locations,
        },
      });
    }

    return await tx.customer_contact.create({
      data: {
        email: normalizedEmail,
        first_name: options.first_name || null,
        last_name: options.last_name || null,
        phone: options.phone || null,
        is_customer: options.is_customer ?? false,
        is_newsletter: options.is_newsletter ?? false,
        is_unsubscribed: false,
        total_spent: totalSpent,
        total_orders: totalOrders,
        total_quantity: totalQuantity,
        categories_bought: categoriesBought,
        locations: locations,
      },
    });
  });
}

export async function updateCustomerContactInDB(
  id: number,
  data: {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    is_customer?: boolean;
    is_newsletter?: boolean;
    is_unsubscribed?: boolean;
  },
) {
  return await prisma.$transaction(async (tx) => {
    const updateData: Prisma.customer_contactUpdateInput = {
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      is_customer: data.is_customer,
      is_newsletter: data.is_newsletter,
    };

    if (data.is_unsubscribed !== undefined) {
      updateData.is_unsubscribed = data.is_unsubscribed;
      updateData.unsubscribed_at = data.is_unsubscribed ? new Date() : null;
    }

    return await tx.customer_contact.update({
      where: { id },
      data: updateData,
    });
  });
}

export async function recalculateCustomerContactMetricsInDB(contactId: number) {
  return await prisma.$transaction(async (tx) => {
    const contact = await tx.customer_contact.findUnique({
      where: { id: contactId },
    });
    if (!contact) return null;

    const orders = await tx.order.findMany({
      where: {
        customer_email: contact.email,
        deleted_at: null,
      },
      include: {
        items: true,
      },
    });

    let totalSpent = new Prisma.Decimal(0);
    let totalOrders = orders.length;
    let totalQuantity = 0;
    const categorySet = new Set<string>();
    const locationSet = new Set<string>();

    for (const order of orders) {
      totalSpent = totalSpent.add(order.total);
      for (const item of order.items) {
        totalQuantity += item.quantity;
      }
      if (order.shipping_city && order.shipping_country) {
        locationSet.add(`${order.shipping_city}, ${order.shipping_country}`);
      }
    }

    const productIds = orders
      .flatMap((o) => o.items.map((i) => i.product_id))
      .filter((id): id is number => id !== null);

    if (productIds.length > 0) {
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { category_name: true },
      });
      for (const p of products) {
        if (p.category_name) categorySet.add(p.category_name);
      }
    }

    return await tx.customer_contact.update({
      where: { id: contactId },
      data: {
        total_spent: totalSpent,
        total_orders: totalOrders,
        total_quantity: totalQuantity,
        categories_bought: Array.from(categorySet),
        locations: Array.from(locationSet),
      },
    });
  });
}

export async function getCustomerContactsDashboardDataInDB(
  where?: Prisma.customer_contactWhereInput,
  skip: number = 0,
  take: number = 10,
) {
  const [contacts, totalCount] = await prisma.$transaction([
    prisma.customer_contact.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
    }),
    prisma.customer_contact.count({ where }),
  ]);

  return { contacts, totalCount };
}
