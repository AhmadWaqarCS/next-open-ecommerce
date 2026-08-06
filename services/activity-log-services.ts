import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export interface CreateActivityLogInput {
  action: string;
  entity_type: string;
  entity_id?: string | number | null;
  user_id?: number | null;
  user_email?: string | null;
  user_role?: string | null;
  status?: "SUCCESS" | "FAILED";
  details?: Record<string, any>;
  ip_address?: string | null;
}

/**
 * Service function to create an activity log entry in the database.
 * Designed to be fail-safe: if logging fails for any reason, the error is caught
 * and logged to console, returning null without throwing or breaking main transactions.
 */
export async function createActivityLogInDB(
  data: CreateActivityLogInput,
  tx?: Prisma.TransactionClient,
) {
  try {
    const client = tx || prisma;
    const logEntry = await client.activity_log.create({
      data: {
        action: data.action,
        entity_type: data.entity_type,
        entity_id: data.entity_id != null ? String(data.entity_id) : null,
        user_id: data.user_id ?? null,
        user_email: data.user_email ?? null,
        user_role: data.user_role ?? null,
        status: data.status || "SUCCESS",
        details: (data.details ?? {}) as any,
        ip_address: data.ip_address ?? null,
      },
    });
    return logEntry;
  } catch (error) {
    console.error("Failed to persist activity log entry:", error);
    return null;
  }
}
