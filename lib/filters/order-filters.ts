import { Prisma } from "@/lib/generated/prisma/client";

export interface OrderFilterParams {
  id?: string;
  order_number?: string;
  customer_email?: string;
  customer_name?: string;
  customer_phone?: string;
  payment_status?: string;
  fulfillment_status?: string;
  payment_method?: string;
  carrier_name?: string;
  coupon_code?: string;
  tracking_number?: string;
  shipping_country?: string;
  shipping_city?: string;
  has_coupon?: string; // "true" | "false"
  has_tracking?: string; // "true" | "false"
  has_notes?: string; // "true" | "false"
  min_total?: string;
  max_total?: string;
  min_subtotal?: string;
  max_subtotal?: string;
  placed_from?: string;
  placed_to?: string;
  paid_from?: string;
  paid_to?: string;
  shipped_from?: string;
  shipped_to?: string;
  delivered_from?: string;
  delivered_to?: string;
  created_from?: string;
  created_to?: string;
  created_by?: string;
  updated_by?: string;
  updated_from?: string;
  updated_to?: string;
}

export function buildOrderWhereInput(
  params: OrderFilterParams,
  isTrash: boolean = false
): Prisma.orderWhereInput {
  const where: Prisma.orderWhereInput = {};

  // Soft delete filter
  if (isTrash) {
    where.NOT = { deleted_at: null };
  } else {
    where.deleted_at = null;
  }

  // ID filter
  if (params.id && !isNaN(Number(params.id))) {
    where.id = Number(params.id);
  }

  const andConditions: Prisma.orderWhereInput[] = [];

  // Main search (order_number, email, names, phone, tracking, coupon)
  if (params.order_number?.trim()) {
    const query = params.order_number.trim();
    andConditions.push({
      OR: [
        { order_number: { contains: query, mode: "insensitive" } },
        { customer_email: { contains: query, mode: "insensitive" } },
        { customer_first_name: { contains: query, mode: "insensitive" } },
        { customer_last_name: { contains: query, mode: "insensitive" } },
        { customer_phone: { contains: query, mode: "insensitive" } },
        { tracking_number: { contains: query, mode: "insensitive" } },
        { coupon_code: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  // Customer Email filter
  if (params.customer_email?.trim()) {
    andConditions.push({
      customer_email: { contains: params.customer_email.trim(), mode: "insensitive" },
    });
  }

  // Customer Name filter
  if (params.customer_name?.trim()) {
    const nameQuery = params.customer_name.trim();
    andConditions.push({
      OR: [
        { customer_first_name: { contains: nameQuery, mode: "insensitive" } },
        { customer_last_name: { contains: nameQuery, mode: "insensitive" } },
      ],
    });
  }

  // Customer Phone filter
  if (params.customer_phone?.trim()) {
    andConditions.push({
      customer_phone: { contains: params.customer_phone.trim(), mode: "insensitive" },
    });
  }

  // Coupon Code filter
  if (params.coupon_code?.trim()) {
    andConditions.push({
      coupon_code: { contains: params.coupon_code.trim(), mode: "insensitive" },
    });
  }

  // Tracking Number filter
  if (params.tracking_number?.trim()) {
    andConditions.push({
      tracking_number: { contains: params.tracking_number.trim(), mode: "insensitive" },
    });
  }

  // Shipping Country filter
  if (params.shipping_country?.trim()) {
    andConditions.push({
      shipping_country: { contains: params.shipping_country.trim(), mode: "insensitive" },
    });
  }

  // Shipping City filter
  if (params.shipping_city?.trim()) {
    andConditions.push({
      shipping_city: { contains: params.shipping_city.trim(), mode: "insensitive" },
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  // Payment Status filter
  if (params.payment_status?.trim()) {
    where.payment_status = params.payment_status.trim();
  }

  // Fulfillment Status filter
  if (params.fulfillment_status?.trim()) {
    where.fulfillment_status = params.fulfillment_status.trim();
  }

  // Payment Method filter
  if (params.payment_method?.trim()) {
    where.payment_method = { contains: params.payment_method.trim(), mode: "insensitive" };
  }

  // Carrier Name filter
  if (params.carrier_name?.trim()) {
    where.carrier_name = { contains: params.carrier_name.trim(), mode: "insensitive" };
  }

  // Has Coupon filter
  if (params.has_coupon === "true") {
    where.coupon_code = { not: null };
  } else if (params.has_coupon === "false") {
    where.coupon_code = null;
  }

  // Has Tracking filter
  if (params.has_tracking === "true") {
    where.tracking_number = { not: null };
  } else if (params.has_tracking === "false") {
    where.tracking_number = null;
  }

  // Has Notes filter
  if (params.has_notes === "true") {
    where.OR = [
      { customer_notes: { not: null } },
      { admin_notes: { not: null } },
    ];
  } else if (params.has_notes === "false") {
    where.customer_notes = null;
    where.admin_notes = null;
  }

  // Total Amount Range filter
  if (params.min_total || params.max_total) {
    where.total = {};
    if (params.min_total && !isNaN(Number(params.min_total))) {
      where.total.gte = Number(params.min_total);
    }
    if (params.max_total && !isNaN(Number(params.max_total))) {
      where.total.lte = Number(params.max_total);
    }
  }

  // Subtotal Amount Range filter
  if (params.min_subtotal || params.max_subtotal) {
    where.subtotal = {};
    if (params.min_subtotal && !isNaN(Number(params.min_subtotal))) {
      where.subtotal.gte = Number(params.min_subtotal);
    }
    if (params.max_subtotal && !isNaN(Number(params.max_subtotal))) {
      where.subtotal.lte = Number(params.max_subtotal);
    }
  }

  // Placed At Date Range
  if (params.placed_from || params.placed_to) {
    where.placed_at = {};
    if (params.placed_from) {
      where.placed_at.gte = new Date(params.placed_from);
    }
    if (params.placed_to) {
      const toDate = new Date(params.placed_to);
      toDate.setHours(23, 59, 59, 999);
      where.placed_at.lte = toDate;
    }
  }

  // Paid At Date Range
  if (params.paid_from || params.paid_to) {
    where.paid_at = {};
    if (params.paid_from) {
      where.paid_at.gte = new Date(params.paid_from);
    }
    if (params.paid_to) {
      const toDate = new Date(params.paid_to);
      toDate.setHours(23, 59, 59, 999);
      where.paid_at.lte = toDate;
    }
  }

  // Shipped At Date Range
  if (params.shipped_from || params.shipped_to) {
    where.shipped_at = {};
    if (params.shipped_from) {
      where.shipped_at.gte = new Date(params.shipped_from);
    }
    if (params.shipped_to) {
      const toDate = new Date(params.shipped_to);
      toDate.setHours(23, 59, 59, 999);
      where.shipped_at.lte = toDate;
    }
  }

  // Delivered At Date Range
  if (params.delivered_from || params.delivered_to) {
    where.delivered_at = {};
    if (params.delivered_from) {
      where.delivered_at.gte = new Date(params.delivered_from);
    }
    if (params.delivered_to) {
      const toDate = new Date(params.delivered_to);
      toDate.setHours(23, 59, 59, 999);
      where.delivered_at.lte = toDate;
    }
  }

  // Created By User
  if (params.created_by && !isNaN(Number(params.created_by))) {
    where.created_by = Number(params.created_by);
  }

  // Updated By User
  if (params.updated_by && !isNaN(Number(params.updated_by))) {
    where.updated_by = Number(params.updated_by);
  }

  // Created Date Range (general created_at)
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

  // Updated Date Range (general updated_at)
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

export async function getOrderFilterWhere(
  params: OrderFilterParams,
  isTrash: boolean = false
): Promise<Prisma.orderWhereInput> {
  return buildOrderWhereInput(params, isTrash);
}
