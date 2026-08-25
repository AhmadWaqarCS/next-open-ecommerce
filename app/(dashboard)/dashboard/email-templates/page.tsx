import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";
import { EmailTemplateClient } from "./email-template-client";

export const metadata = {
  title: "Email Templates | Dashboard",
};

export default function EmailTemplatesPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <EmailTemplatesPageContent />
    </Suspense>
  );
}

async function EmailTemplatesPageContent() {
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
    is_system: t.is_system,
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
