import { Prisma } from "@/lib/generated/prisma/client";

export interface CustomerFilterParams {
  id?: string;
  search?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_customer?: string; // "true" | "false"
  is_newsletter?: string; // "true" | "false"
  is_unsubscribed?: string; // "true" | "false"
  min_spent?: string;
  max_spent?: string;
  min_orders?: string;
  max_orders?: string;
  created_from?: string;
  created_to?: string;
  updated_from?: string;
  updated_to?: string;
}

export function buildCustomerWhereInput(
  params: CustomerFilterParams,
): Prisma.customer_contactWhereInput {
  const where: Prisma.customer_contactWhereInput = {};

  // ID search
  if (params.id && !isNaN(Number(params.id))) {
    where.id = Number(params.id);
  }

  // Combined Search input (email, first_name, last_name, phone)
  if (params.search?.trim()) {
    const query = params.search.trim();
    where.OR = [
      { email: { contains: query, mode: "insensitive" } },
      { first_name: { contains: query, mode: "insensitive" } },
      { last_name: { contains: query, mode: "insensitive" } },
      { phone: { contains: query, mode: "insensitive" } },
    ];
  }

  // Specific Email Search
  if (params.email?.trim()) {
    where.email = { contains: params.email.trim(), mode: "insensitive" };
  }

  // Specific Name Search
  if (params.first_name?.trim()) {
    where.first_name = { contains: params.first_name.trim(), mode: "insensitive" };
  }
  if (params.last_name?.trim()) {
    where.last_name = { contains: params.last_name.trim(), mode: "insensitive" };
  }

  // Specific Phone Search
  if (params.phone?.trim()) {
    where.phone = { contains: params.phone.trim(), mode: "insensitive" };
  }

  // Is Customer Flag
  if (params.is_customer === "true") {
    where.is_customer = true;
  } else if (params.is_customer === "false") {
    where.is_customer = false;
  }

  // Is Newsletter Subscriber Flag
  if (params.is_newsletter === "true") {
    where.is_newsletter = true;
  } else if (params.is_newsletter === "false") {
    where.is_newsletter = false;
  }

  // Is Unsubscribed Flag
  if (params.is_unsubscribed === "true") {
    where.is_unsubscribed = true;
  } else if (params.is_unsubscribed === "false") {
    where.is_unsubscribed = false;
  }

  // Total Spent Range
  if (params.min_spent || params.max_spent) {
    where.total_spent = {};
    if (params.min_spent && !isNaN(Number(params.min_spent))) {
      where.total_spent.gte = Number(params.min_spent);
    }
    if (params.max_spent && !isNaN(Number(params.max_spent))) {
      where.total_spent.lte = Number(params.max_spent);
    }
  }

  // Total Orders Range
  if (params.min_orders || params.max_orders) {
    where.total_orders = {};
    if (params.min_orders && !isNaN(Number(params.min_orders))) {
      where.total_orders.gte = Number(params.min_orders);
    }
    if (params.max_orders && !isNaN(Number(params.max_orders))) {
      where.total_orders.lte = Number(params.max_orders);
    }
  }

  // Created Date Range
  if (params.created_from || params.created_to) {
    where.created_at = {};
    if (params.created_from) {
      where.created_at.gte = new Date(params.created_from);
    }
    if (params.created_to) {
      const toDate = new Date(params.created_to);
      toDate.setHours(23, 59, 59, 999);
      where.created_at.lte = toDate;
    }
  }

  // Updated Date Range
  if (params.updated_from || params.updated_to) {
    where.updated_at = {};
    if (params.updated_from) {
      where.updated_at.gte = new Date(params.updated_from);
    }
    if (params.updated_to) {
      const toDate = new Date(params.updated_to);
      toDate.setHours(23, 59, 59, 999);
      where.updated_at.lte = toDate;
    }
  }

  return where;
}

export async function getCustomerFilterWhere(
  params: CustomerFilterParams,
): Promise<Prisma.customer_contactWhereInput> {
  return buildCustomerWhereInput(params);
}
