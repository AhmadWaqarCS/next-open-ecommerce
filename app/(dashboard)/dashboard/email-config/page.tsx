import prisma from "@/lib/prisma";
import { assertPermission } from "@/lib/guards";
import EmailConfigManagerClient from "./email-config-manager-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Email Configuration",
  description:
    "Configure email sender identity, SMTP environment integration by purpose, and rate-limited dispatch rules",
};

export default async function EmailConfigPage() {
  const { permissions } = await assertPermission(
    "update",
    "/dashboard/email-config",
  );

  const configs = await prisma.email_config.findMany({
    where: { deleted_at: null },
    orderBy: { id: "asc" },
  });

  const serializedConfigs = configs.map((c) => ({
    id: c.id,
    purpose: c.purpose,
    name: c.name,
    provider: c.provider,
    from_name: c.from_name,
    from_email: c.from_email,
    reply_to_email: c.reply_to_email,
    send_order_confirmation: c.send_order_confirmation,
    send_shipping_update: c.send_shipping_update,
    send_admin_new_order: c.send_admin_new_order,
    admin_notification_email: c.admin_notification_email,
    include_pdf_invoice: c.include_pdf_invoice,
    time_delay_ms: c.time_delay_ms,
    is_active: c.is_active,
  }));

  return (
    <EmailConfigManagerClient
      configs={serializedConfigs}
      permissions={permissions}
    />
  );
}
