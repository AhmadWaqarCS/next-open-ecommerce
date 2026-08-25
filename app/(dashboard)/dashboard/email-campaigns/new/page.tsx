import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import prisma from "@/lib/prisma";
import { assertPermission } from "@/lib/guards";
import CampaignFormClient from "../campaign-form-client";

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <NewCampaignPageContent />
    </Suspense>
  );
}

async function NewCampaignPageContent() {
  await assertPermission("create", "/dashboard/email-campaigns");

  const [configs, templates, groups] = await Promise.all([
    prisma.email_config.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, purpose: true, from_email: true, is_active: true },
    }),
    prisma.email_template.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, subject: true, body_html: true },
    }),
    prisma.email_group.findMany({
      select: { id: true, name: true, member_count: true },
    }),
  ]);

  return (
    <CampaignFormClient
      configs={configs}
      templates={templates}
      groups={groups}
    />
  );
}
