import prisma from "@/lib/prisma";

export async function createEmailConfigTransaction(
  data: {
    provider?: string;
    from_name: string;
    from_email: string;
    reply_to_email?: string | null;
    send_order_confirmation?: boolean;
    send_shipping_update?: boolean;
    send_admin_new_order?: boolean;
    admin_notification_email?: string | null;
    include_pdf_invoice?: boolean;
    is_active?: boolean;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    return await tx.email_config.create({
      data: {
        ...data,
        created_by: userId,
        updated_by: userId,
      },
    });
  });
}

export async function updateEmailConfigTransaction(
  id: number,
  data: {
    provider?: string;
    from_name?: string;
    from_email?: string;
    reply_to_email?: string | null;
    send_order_confirmation?: boolean;
    send_shipping_update?: boolean;
    send_admin_new_order?: boolean;
    admin_notification_email?: string | null;
    include_pdf_invoice?: boolean;
    is_active?: boolean;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    return await tx.email_config.update({
      where: { id },
      data: { ...data, updated_by: userId },
    });
  });
}

export async function getEmailConfigDashboardDataInDB() {
  return await prisma.email_config.findFirst({
    where: { deleted_at: null },
  });
}
