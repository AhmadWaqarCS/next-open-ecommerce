import type { Prisma } from "@/lib/generated/prisma/client";

export interface ActivityLogFilterParams {
  search?: string;
  user_email?: string;
  ip_address?: string;
  action?: string;
  entity_type?: string;
  status?: string;
  created_from?: string;
  created_to?: string;
}

export function getActivityLogFilterWhere(
  params: ActivityLogFilterParams
): Prisma.activity_logWhereInput {
  const where: Prisma.activity_logWhereInput = {};

  if (params.search?.trim()) {
    const query = params.search.trim();
    where.OR = [
      { user_email: { contains: query, mode: "insensitive" } },
      { ip_address: { contains: query, mode: "insensitive" } },
      { action: { contains: query, mode: "insensitive" } },
      { entity_type: { contains: query, mode: "insensitive" } },
      { entity_id: { contains: query, mode: "insensitive" } },
    ];
  }

  if (params.user_email?.trim()) {
    where.user_email = { contains: params.user_email.trim(), mode: "insensitive" };
  }

  if (params.ip_address?.trim()) {
    where.ip_address = { contains: params.ip_address.trim(), mode: "insensitive" };
  }

  if (params.action?.trim()) {
    where.action = params.action.trim();
  }

  if (params.entity_type?.trim()) {
    where.entity_type = params.entity_type.trim();
  }

  if (params.status?.trim() && (params.status === "SUCCESS" || params.status === "FAILED")) {
    where.status = params.status;
  }

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
