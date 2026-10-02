import type { Prisma } from "@/lib/generated/prisma/client";

export interface SentEmailFilterParams {
  id?: string;
  search?: string;
  subject?: string;
  recipient_email?: string;
  sender_email?: string;
  order_number?: string;
  type?: string;
  status?: string;
  sent_from?: string;
  sent_to?: string;
}

export function buildSentEmailWhereInput(
  params: SentEmailFilterParams,
): Prisma.sent_emailWhereInput {
  const where: Prisma.sent_emailWhereInput = {};
  const andConditions: Prisma.sent_emailWhereInput[] = [];

  if (params.id && !isNaN(Number(params.id))) {
    where.id = Number(params.id);
  }

  // Multi-field search query
  const query = params.search?.trim() || params.subject?.trim();
  if (query) {
    andConditions.push({
      OR: [
        { subject: { contains: query, mode: "insensitive" } },
        { recipient_email: { contains: query, mode: "insensitive" } },
        { recipient_name: { contains: query, mode: "insensitive" } },
        { sender_email: { contains: query, mode: "insensitive" } },
        { order_number: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  // Specific recipient email filter (if distinct from generic search)
  if (params.recipient_email?.trim() && params.recipient_email.trim() !== query) {
    andConditions.push({
      recipient_email: {
        contains: params.recipient_email.trim(),
        mode: "insensitive",
      },
    });
  }

  // Specific sender email filter
  if (params.sender_email?.trim()) {
    andConditions.push({
      sender_email: {
        contains: params.sender_email.trim(),
        mode: "insensitive",
      },
    });
  }

  // Specific order number filter (if distinct from generic search)
  if (params.order_number?.trim() && params.order_number.trim() !== query) {
    andConditions.push({
      order_number: {
        contains: params.order_number.trim(),
        mode: "insensitive",
      },
    });
  }

  // Email type filter (marketing, newsletter, order, invoice, support)
  if (params.type?.trim()) {
    andConditions.push({
      type: params.type.trim(),
    });
  }

  // Status filter
  if (params.status?.trim()) {
    andConditions.push({
      status: params.status.trim(),
    });
  }

  // Date range filter on sent_at
  if (params.sent_from || params.sent_to) {
    const sentAtCondition: Prisma.DateTimeNullableFilter = {};
    if (params.sent_from) {
      sentAtCondition.gte = new Date(params.sent_from);
    }
    if (params.sent_to) {
      const toDate = new Date(params.sent_to);
      toDate.setHours(23, 59, 59, 999);
      sentAtCondition.lte = toDate;
    }
    andConditions.push({ sent_at: sentAtCondition });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}
