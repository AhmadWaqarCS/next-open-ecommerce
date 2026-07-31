import prisma from "@/lib/prisma";

export async function getEmailConfigFromDB() {
  return await prisma.email_config.findFirst({ where: { deleted_at: null } });
}

export async function createEmailConfigInDB(data: {
  provider?: string;
  from_name: string;
  from_email: string;
  reply_to_email?: string | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_secure?: boolean;
  send_order_confirmation?: boolean;
  send_shipping_update?: boolean;
  send_admin_new_order?: boolean;
  admin_notification_email?: string | null;
  include_pdf_invoice?: boolean;
  is_active?: boolean;
  created_by: number;
  updated_by: number;
}) {
  return await prisma.email_config.create({ data });
}

export async function updateEmailConfigInDB(
  id: number,
  data: {
    provider?: string;
    from_name?: string;
    from_email?: string;
    reply_to_email?: string | null;
    smtp_host?: string | null;
    smtp_port?: number | null;
    smtp_secure?: boolean;
    send_order_confirmation?: boolean;
    send_shipping_update?: boolean;
    send_admin_new_order?: boolean;
    admin_notification_email?: string | null;
    include_pdf_invoice?: boolean;
    is_active?: boolean;
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
) {
  return await prisma.email_config.update({ where: { id }, data });
}
