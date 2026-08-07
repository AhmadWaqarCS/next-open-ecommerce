import { Prisma } from "@/lib/generated/prisma/client";

export interface EmailCampaignFilterParams {
  id?: string;
  name?: string;
  search?: string;
  strategy?: string; // "single" | "per_recipient"
  status?: string; // "draft" | "scheduled" | "sending" | "completed" | "partially_failed" | "failed"
  email_config_id?: string;
  template_id?: string;
  min_recipients?: string;
  max_recipients?: string;
  min_sent?: string;
  max_sent?: string;
  min_failed?: string;
  max_failed?: string;
  scheduled_from?: string;
  scheduled_to?: string;
  sent_from?: string;
  sent_to?: string;
  created_by?: string;
  created_from?: string;
  created_to?: string;
  updated_by?: string;
  updated_from?: string;
  updated_to?: string;
}

export function buildEmailCampaignWhereInput(
  params: EmailCampaignFilterParams,
): Prisma.email_campaignWhereInput {
  const where: Prisma.email_campaignWhereInput = {};

  // ID search
  if (params.id && !isNaN(Number(params.id))) {
    where.id = Number(params.id);
  }

  // Name / Search text filter
  const textQuery = params.name?.trim() || params.search?.trim();
  if (textQuery) {
    where.OR = [
      { name: { contains: textQuery, mode: "insensitive" } },
      { subject: { contains: textQuery, mode: "insensitive" } },
    ];
  }

  // Strategy filter
  if (params.strategy === "single" || params.strategy === "per_recipient") {
    where.strategy = params.strategy;
  }

  // Status filter
  if (
    params.status &&
    ["draft", "scheduled", "sending", "completed", "partially_failed", "failed"].includes(
      params.status,
    )
  ) {
    where.status = params.status;
  }

  // Config ID filter
  if (params.email_config_id && !isNaN(Number(params.email_config_id))) {
    where.email_config_id = Number(params.email_config_id);
  }

  // Template ID filter
  if (params.template_id && !isNaN(Number(params.template_id))) {
    where.template_id = Number(params.template_id);
  }

  // Total Recipients Range
  if (params.min_recipients || params.max_recipients) {
    where.total_recipients = {};
    if (params.min_recipients && !isNaN(Number(params.min_recipients))) {
      where.total_recipients.gte = Number(params.min_recipients);
    }
    if (params.max_recipients && !isNaN(Number(params.max_recipients))) {
      where.total_recipients.lte = Number(params.max_recipients);
    }
  }

  // Sent Count Range
  if (params.min_sent || params.max_sent) {
    where.sent_count = {};
    if (params.min_sent && !isNaN(Number(params.min_sent))) {
      where.sent_count.gte = Number(params.min_sent);
    }
    if (params.max_sent && !isNaN(Number(params.max_sent))) {
      where.sent_count.lte = Number(params.max_sent);
    }
  }

  // Failed Count Range
  if (params.min_failed || params.max_failed) {
    where.failed_count = {};
    if (params.min_failed && !isNaN(Number(params.min_failed))) {
      where.failed_count.gte = Number(params.min_failed);
    }
    if (params.max_failed && !isNaN(Number(params.max_failed))) {
      where.failed_count.lte = Number(params.max_failed);
    }
  }

  // Scheduled Date Range
  if (params.scheduled_from || params.scheduled_to) {
    where.scheduled_at = {};
    if (params.scheduled_from) {
      where.scheduled_at.gte = new Date(params.scheduled_from);
    }
    if (params.scheduled_to) {
      const toDate = new Date(params.scheduled_to);
      toDate.setHours(23, 59, 59, 999);
      where.scheduled_at.lte = toDate;
    }
  }

  // Sent Date Range
  if (params.sent_from || params.sent_to) {
    where.sent_at = {};
    if (params.sent_from) {
      where.sent_at.gte = new Date(params.sent_from);
    }
    if (params.sent_to) {
      const toDate = new Date(params.sent_to);
      toDate.setHours(23, 59, 59, 999);
      where.sent_at.lte = toDate;
    }
  }

  // Created By User
  if (params.created_by && !isNaN(Number(params.created_by))) {
    where.created_by = Number(params.created_by);
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

  // Updated By User
  if (params.updated_by && !isNaN(Number(params.updated_by))) {
    where.updated_by = Number(params.updated_by);
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

export async function getEmailCampaignFilterWhere(
  params: EmailCampaignFilterParams,
): Promise<Prisma.email_campaignWhereInput> {
  return buildEmailCampaignWhereInput(params);
}
