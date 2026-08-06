import { assertPermission } from "@/lib/guards";
import { EmailTemplateEditor } from "../_components/email-template-editor";

export const metadata = {
  title: "Create Email Template | Dashboard",
};

interface PageProps {
  searchParams: Promise<{ key?: string }>;
}

export default async function NewEmailTemplatePage({ searchParams }: PageProps) {
  await assertPermission("create", "/dashboard/email-templates");

  const resolvedParams = await searchParams;
  const defaultKey = resolvedParams.key || "invoice";

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <EmailTemplateEditor defaultKey={defaultKey} isEditMode={false} />
    </div>
  );
}
