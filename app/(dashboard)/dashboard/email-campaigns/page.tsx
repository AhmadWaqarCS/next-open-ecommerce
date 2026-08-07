import { assertPermission } from "@/lib/guards";
import EmailCampaignTable from "./email-campaign-table";
import Pagination from "@/app/(dashboard)/_components/pagination";
import {
  EmailCampaignFilterParams,
  getEmailCampaignFilterWhere,
} from "@/lib/filters/email-campaign-filters";
import { getEmailCampaignsDashboardDataInDB } from "@/services/email-campaign-services";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Email Campaigns",
  description: "Create, schedule, and execute targeted email marketing campaigns",
};

export default async function EmailCampaignsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const { permissions } = await assertPermission("read", "/dashboard/email-campaigns");
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const filterParams: EmailCampaignFilterParams = {
    id: typeof params?.id === "string" ? params.id : undefined,
    name: typeof params?.name === "string" ? params.name : undefined,
    search: typeof params?.search === "string" ? params.search : undefined,
    strategy: typeof params?.strategy === "string" ? params.strategy : undefined,
    status: typeof params?.status === "string" ? params.status : undefined,
    email_config_id: typeof params?.email_config_id === "string" ? params.email_config_id : undefined,
    template_id: typeof params?.template_id === "string" ? params.template_id : undefined,
    min_recipients: typeof params?.min_recipients === "string" ? params.min_recipients : undefined,
    max_recipients: typeof params?.max_recipients === "string" ? params.max_recipients : undefined,
    scheduled_from: typeof params?.scheduled_from === "string" ? params.scheduled_from : undefined,
    scheduled_to: typeof params?.scheduled_to === "string" ? params.scheduled_to : undefined,
    created_from: typeof params?.created_from === "string" ? params.created_from : undefined,
    created_to: typeof params?.created_to === "string" ? params.created_to : undefined,
  };

  const where = await getEmailCampaignFilterWhere(filterParams);

  const { campaigns, totalCount } = await getEmailCampaignsDashboardDataInDB(
    where,
    skipCount,
    pageSize,
  );

  const serializedCampaigns = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    strategy: c.strategy,
    status: c.status,
    scheduled_at: c.scheduled_at ? c.scheduled_at.toISOString() : null,
    sent_at: c.sent_at ? c.sent_at.toISOString() : null,
    total_recipients: c.total_recipients,
    sent_count: c.sent_count,
    failed_count: c.failed_count,
    email_config: c.email_config,
    template: c.template,
    created_at: c.created_at.toISOString(),
  }));

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <EmailCampaignTable
        campaigns={serializedCampaigns}
        filterParams={filterParams}
        permissions={permissions}
        totalCount={totalCount}
      />

      <Pagination
        totalItems={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="campaigns"
      />
    </div>
  );
}
