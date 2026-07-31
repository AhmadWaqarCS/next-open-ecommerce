import { Prisma } from "@/lib/generated/prisma/client";

export interface NewsletterFilterParams {
  id?: string;
  email?: string;
  created_from?: string;
  created_to?: string;
}

export function buildNewsletterWhereInput(
  params: NewsletterFilterParams
): Prisma.newsletter_subscriberWhereInput {
  const where: Prisma.newsletter_subscriberWhereInput = {};

  // ID search
  if (params.id && !isNaN(Number(params.id))) {
    where.id = Number(params.id);
  }

  // Email search
  if (params.email?.trim()) {
    where.email = { contains: params.email.trim(), mode: "insensitive" };
  }

  // Subscribed At Date Range
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

  return where;
}

export async function getNewsletterFilterWhere(
  params: NewsletterFilterParams
): Promise<Prisma.newsletter_subscriberWhereInput> {
  return buildNewsletterWhereInput(params);
}
