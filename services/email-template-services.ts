import prisma from "@/lib/prisma";
import { sanitizeEmailHtml } from "@/lib/email-sanitizer";

export interface CreateEmailTemplateData {
  key: string;
  name: string;
  description?: string | null;
  subject: string;
  body_html: string;
  available_variables?: any;
  is_active?: boolean;
  is_system?: boolean;
  created_by?: number;
}

export interface UpdateEmailTemplateData {
  name?: string;
  description?: string | null;
  subject?: string;
  body_html?: string;
  available_variables?: any;
  is_active?: boolean;
  updated_by?: number;
  deleted_at?: Date | null;
  deleted_by?: number | null;
}

export async function createEmailTemplateInDB(data: CreateEmailTemplateData) {
  const sanitizedHtml = sanitizeEmailHtml(data.body_html);
  const createdBy = data.created_by || 1;

  return await prisma.$transaction(async (tx) => {
    if (data.is_active) {
      await tx.email_template.updateMany({
        where: { key: data.key, deleted_at: null },
        data: { is_active: false },
      });
    }

    return await tx.email_template.create({
      data: {
        key: data.key,
        name: data.name,
        description: data.description || null,
        subject: data.subject,
        body_html: sanitizedHtml,
        available_variables: data.available_variables || null,
        is_active: data.is_active || false,
        is_system: data.is_system || false,
        created_by: createdBy,
        updated_by: createdBy,
      },
    });
  });
}

export async function updateEmailTemplateInDB(id: number, data: UpdateEmailTemplateData) {
  const existing = await prisma.email_template.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error(`Email template with ID ${id} not found.`);
  }

  const isBeingSoftDeleted = data.deleted_at !== undefined && data.deleted_at !== null;

  // SYSTEM TEMPLATE IMMUTABILITY PROTECTION
  if (existing.is_system) {
    if (isBeingSoftDeleted) {
      throw new Error("Protected Template: System email templates cannot be deleted.");
    }
    if (data.is_active === false) {
      throw new Error("Protected Template: System email templates must remain active.");
    }
  }

  const sanitizedHtml = data.body_html !== undefined ? sanitizeEmailHtml(data.body_html) : undefined;

  return await prisma.$transaction(async (tx) => {
    if (data.is_active === true && !isBeingSoftDeleted) {
      await tx.email_template.updateMany({
        where: { key: existing.key, id: { not: id }, deleted_at: null },
        data: { is_active: false },
      });
    }

    const finalIsActive = isBeingSoftDeleted ? false : (existing.is_system ? true : data.is_active);

    return await tx.email_template.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(sanitizedHtml !== undefined && { body_html: sanitizedHtml }),
        ...(data.available_variables !== undefined && { available_variables: data.available_variables }),
        ...(finalIsActive !== undefined && { is_active: finalIsActive }),
        ...(data.updated_by !== undefined && { updated_by: data.updated_by }),
        ...(data.deleted_at !== undefined && { deleted_at: data.deleted_at }),
        ...(data.deleted_by !== undefined && { deleted_by: data.deleted_by }),
      },
    });
  });
}

export async function deleteEmailTemplatePermanentlyInDB(id: number) {
  const existing = await prisma.email_template.findUnique({
    where: { id },
  });

  if (existing?.is_system) {
    throw new Error("Protected Template: System email templates cannot be deleted.");
  }

  return await prisma.email_template.delete({
    where: { id },
  });
}
