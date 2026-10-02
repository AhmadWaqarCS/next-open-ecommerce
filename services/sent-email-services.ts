import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export interface CreateSentEmailData {
  type?: string;
  sender_email: string;
  recipient_email: string;
  recipient_name?: string | null;
  subject: string;
  order_number?: string | null;
  status?: string;
  error_message?: string | null;
  body_html: string;
  invoice_id?: number | null;
  order_id?: number | null;
  sent_at?: Date | null;
}

/**
 * Creates an immutable sent email record in the database.
 * Strictly invoked only upon verified successful email transmission via nodemailer.
 */
export async function createSentEmailInDB(data: CreateSentEmailData) {
  try {
    return await prisma.sent_email.create({
      data: {
        type: data.type || "invoice",
        sender_email: data.sender_email,
        recipient_email: data.recipient_email,
        recipient_name: data.recipient_name || null,
        subject: data.subject,
        order_number: data.order_number || null,
        status: data.status || "successful",
        error_message: data.error_message || null,
        body_html: data.body_html,
        invoice_id: data.invoice_id || null,
        order_id: data.order_id || null,
        sent_at: data.sent_at !== undefined ? data.sent_at : new Date(),
      },
    });
  } catch (error) {
    console.error("[createSentEmailInDB] Database insertion error:", error);
    throw error;
  }
}

/**
 * Retrieves paginated sent emails dashboard data with total count in an atomic transaction.
 */
export async function getSentEmailsDashboardDataInDB(
  where: Prisma.sent_emailWhereInput,
  skipCount: number,
  pageSize: number,
) {
  return await prisma.$transaction(async (tx) => {
    const emailsRaw = await tx.sent_email.findMany({
      where,
      take: pageSize,
      skip: skipCount,
      orderBy: { sent_at: "desc" },
    });

    const totalEmails = await tx.sent_email.count({ where });

    return { emailsRaw, totalEmails };
  });
}

/**
 * Retrieves a single sent email record by ID.
 */
export async function getSentEmailByIdFromDB(id: number) {
  return await prisma.sent_email.findUnique({
    where: { id },
  });
}

/**
 * Retrieves detailed sent email information including relations (invoice, order).
 */
export async function getSentEmailDetailsDataInDB(id: number) {
  return await prisma.sent_email.findUnique({
    where: { id },
    include: {
      invoice: true,
      order: true,
    },
  });
}
