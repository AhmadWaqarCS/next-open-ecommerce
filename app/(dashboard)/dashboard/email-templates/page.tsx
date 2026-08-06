import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";
import { EmailTemplateClient } from "./email-template-client";

export const metadata = {
  title: "Email Templates | Dashboard",
};

export default async function EmailTemplatesPage() {
  const { permissions } = await assertPermission(
    "read",
    "/dashboard/email-templates",
  );

  const templatesRaw = await prisma.email_template.findMany({
    orderBy: [{ is_active: "desc" }, { updated_at: "desc" }],
  });

  const templates = templatesRaw.map((t) => ({
    id: t.id,
    key: t.key,
    name: t.name,
    description: t.description,
    subject: t.subject,
    body_html: t.body_html,
    is_active: t.is_active,
    created_at: t.created_at.toISOString(),
    updated_at: t.updated_at.toISOString(),
    deleted_at: t.deleted_at ? t.deleted_at.toISOString() : null,
  }));

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <EmailTemplateClient
        templates={templates}
        userPermissions={permissions}
      />
    </div>
  );
}
