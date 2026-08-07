import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";

export async function createEmailConfigTransaction(
  data: {
    purpose?: string;
    name?: string;
    provider?: string;
    from_name: string;
    from_email: string;
    reply_to_email?: string | null;
    send_order_confirmation?: boolean;
    send_shipping_update?: boolean;
    send_admin_new_order?: boolean;
    admin_notification_email?: string | null;
    include_pdf_invoice?: boolean;
    time_delay_ms?: number;
    is_active?: boolean;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    return await tx.email_config.create({
      data: {
        ...data,
        is_active: false, // Seeded/created as inactive by default
        created_by: userId,
        updated_by: userId,
      },
    });
  });
}

export async function updateEmailConfigTransaction(
  id: number,
  data: {
    purpose?: string;
    name?: string;
    provider?: string;
    from_name?: string;
    from_email?: string;
    reply_to_email?: string | null;
    send_order_confirmation?: boolean;
    send_shipping_update?: boolean;
    send_admin_new_order?: boolean;
    admin_notification_email?: string | null;
    include_pdf_invoice?: boolean;
    time_delay_ms?: number;
    is_active?: boolean;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    return await tx.email_config.update({
      where: { id },
      data: {
        ...data,
        updated_by: userId,
      },
    });
  });
}

export async function verifyAndActivateEmailConfigTransaction(
  id: number,
  userId: number,
) {
  const config = await prisma.email_config.findUnique({
    where: { id },
  });

  if (!config) {
    return { success: false, message: "Email configuration not found." };
  }

  const { getSmtpEnvVarsForPurpose } = await import("@/lib/email-smtp-config");
  const { host, port, secure, user, pass, envKeys } = getSmtpEnvVarsForPurpose(config.purpose);

  if (!host) {
    return {
      success: false,
      message: `${envKeys.hostKey} (or fallback SMTP_HOST) environment variable not configured.`,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: pass ? { user: user || "", pass } : undefined,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });

    await transporter.verify();

    // Nodemailer connection verified successfully -> Activate config in DB!
    await prisma.$transaction(async (tx) => {
      await tx.email_config.update({
        where: { id },
        data: {
          is_active: true,
          updated_by: userId,
        },
      });
    });

    return {
      success: true,
      message: `Nodemailer connection to ${host}:${port} verified successfully! Config "${config.name}" is now ACTIVE.`,
    };
  } catch (error: any) {
    // Deactivate if verification fails
    await prisma.email_config.update({
      where: { id },
      data: { is_active: false, updated_by: userId },
    });

    return {
      success: false,
      message: `Connection failed: ${error?.message || String(error)}`,
    };
  }
}

export async function getEmailConfigByPurposeInDB(purpose: string) {
  return await prisma.email_config.findFirst({
    where: { purpose, is_active: true, deleted_at: null },
  });
}
