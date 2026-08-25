import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import prisma from "@/lib/prisma";
import { assertPermission } from "@/lib/guards";
import { notFound } from "next/navigation";
import CampaignFormClient from "../campaign-form-client";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditCampaignPage(props: PageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <EditCampaignPageContent {...props} />
    </Suspense>
  );
}

async function EditCampaignPageContent({ params }: PageProps) {
  await assertPermission("read", "/dashboard/email-campaigns");
  const { id } = await params;
  const campaignId = Number(id);

  if (isNaN(campaignId)) notFound();

  const campaign = await prisma.email_campaign.findUnique({
    where: { id: campaignId },
    include: {
      recipients: {
        include: {
          customer_contact: true,
        },
      },
    },
  });

  if (!campaign) notFound();

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

  const serializedCampaign = {
    id: campaign.id,
    name: campaign.name,
    strategy: campaign.strategy as "single" | "per_recipient",
    subject: campaign.subject,
    body_html: campaign.body_html,
    status: campaign.status,
    email_config_id: campaign.email_config_id,
    template_id: campaign.template_id,
    scheduled_at: campaign.scheduled_at ? campaign.scheduled_at.toISOString() : null,
    total_recipients: campaign.total_recipients,
    sent_count: campaign.sent_count,
    failed_count: campaign.failed_count,
    recipients: campaign.recipients.map((r) => ({
      id: r.id,
      custom_subject: r.custom_subject,
      custom_body_html: r.custom_body_html,
      status: r.status,
      error_message: r.error_message,
      contact: {
        id: r.customer_contact.id,
        email: r.customer_contact.email,
        first_name: r.customer_contact.first_name,
        last_name: r.customer_contact.last_name,
        is_unsubscribed: r.customer_contact.is_unsubscribed,
      },
    })),
  };

  return (
    <CampaignFormClient
      campaign={serializedCampaign}
      configs={configs}
      templates={templates}
      groups={groups}
    />
  );
}
