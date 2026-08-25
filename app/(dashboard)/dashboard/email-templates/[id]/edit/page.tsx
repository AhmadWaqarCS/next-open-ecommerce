import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { notFound } from "next/navigation";
import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";
import { EmailTemplateEditor } from "../../_components/email-template-editor";

export const metadata = {
  title: "Edit Email Template | Dashboard",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditEmailTemplatePage(props: PageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <EditEmailTemplatePageContent {...props} />
    </Suspense>
  );
}

async function EditEmailTemplatePageContent({ params }: PageProps) {
  await assertPermission("update", "/dashboard/email-templates");

  const resolvedParams = await params;
  const templateId = parseInt(resolvedParams.id, 10);

  if (isNaN(templateId) || templateId < 1) {
    notFound();
  }

  const template = await prisma.email_template.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <EmailTemplateEditor
        initialData={{
          id: template.id,
          key: template.key,
          name: template.name,
          description: template.description,
          subject: template.subject,
          body_html: template.body_html,
          is_active: template.is_active,
        }}
        defaultKey={template.key}
        isEditMode={true}
      />
    </div>
  );
}
