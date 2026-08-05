import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";
import EmailConfigForm from "./email-config-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Email Configuration",
  description:
    "Configure email sender identity, SMTP integration, and notification rules",
};

export default async function EmailConfigPage() {
  const { permissions } = await assertPermission(
    "update",
    "/dashboard/email-config",
  );

  const emailConfig = await prisma.email_config.findFirst({
    where: { deleted_at: null },
  });

  return (
    <div className="space-y-6 flex-1 flex flex-col pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
          Email Configuration
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Configure global email sender details, server connection parameters,
          and transactional email notifications.
        </p>
      </div>

      {!emailConfig ? (
        <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <h2 className="text-lg font-bold text-red-600 dark:text-red-400">
            Email Configuration Not Found
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Please run the database seed script to initialize the default email
            configuration.
          </p>
        </div>
      ) : (
        <EmailConfigForm
          initialData={{
            ...emailConfig,
            reply_to_email: emailConfig.reply_to_email || "",
            admin_notification_email:
              emailConfig.admin_notification_email || "",
          }}
          permissions={permissions}
        />
      )}
    </div>
  );
}
