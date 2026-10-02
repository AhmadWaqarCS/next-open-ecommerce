import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { assertPermission } from "@/lib/guards";
import SentEmailTable from "./sent-email-table";
import { getSentEmailsDashboardDataInDB } from "@/services/sent-email-services";
import {
  buildSentEmailWhereInput,
  SentEmailFilterParams,
} from "@/lib/filters/sent-email-filters";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sent Email Logs",
  description:
    "Track, inspect, and audit outgoing email dispatches sent via Nodemailer",
};

interface PageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function DashboardSentEmailsPage(props: PageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardSentEmailsPageContent {...props} />
    </Suspense>
  );
}

async function DashboardSentEmailsPageContent({ searchParams }: PageProps) {
  const { permissions } = await assertPermission(
    "read",
    "/dashboard/sent-emails",
  );
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const filterParams: SentEmailFilterParams = {
    search: typeof params?.search === "string" ? params.search : undefined,
    subject: typeof params?.subject === "string" ? params.subject : undefined,
    recipient_email:
      typeof params?.recipient_email === "string"
        ? params.recipient_email
        : undefined,
    sender_email:
      typeof params?.sender_email === "string"
        ? params.sender_email
        : undefined,
    order_number:
      typeof params?.order_number === "string"
        ? params.order_number
        : undefined,
    type: typeof params?.type === "string" ? params.type : undefined,
    status: typeof params?.status === "string" ? params.status : undefined,
    sent_from:
      typeof params?.sent_from === "string" ? params.sent_from : undefined,
    sent_to: typeof params?.sent_to === "string" ? params.sent_to : undefined,
  };

  const where = buildSentEmailWhereInput(filterParams);

  const { emailsRaw, totalEmails } = await getSentEmailsDashboardDataInDB(
    where,
    skipCount,
    pageSize,
  );

  const serializedEmails = emailsRaw.map((email) => ({
    id: email.id,
    type: email.type,
    sender_email: email.sender_email,
    recipient_email: email.recipient_email,
    recipient_name: email.recipient_name,
    subject: email.subject,
    order_number: email.order_number,
    status: email.status,
    sent_at: email.sent_at ? email.sent_at.toISOString() : null,
    error_message: email.error_message,
    invoice_id: email.invoice_id,
    order_id: email.order_id,
  }));

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <SentEmailTable
        emails={serializedEmails}
        permissions={permissions}
        totalCount={totalEmails}
        currentPage={currentPage}
        pageSize={pageSize}
      />
    </div>
  );
}
