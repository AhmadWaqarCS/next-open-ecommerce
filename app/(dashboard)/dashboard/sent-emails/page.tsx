import { assertPermission } from "@/lib/guards";
import SentEmailTable from "./sent-email-table";
import Pagination from "@/app/(dashboard)/_components/pagination";
import { getSentEmailsDashboardDataInDB } from "@/services/email-services";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sent Email Logs",
  description:
    "Track and audit outgoing email dispatches and delivery statuses",
};

export default async function DashboardSentEmailsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { permissions } = await assertPermission(
    "read",
    "/dashboard/sent-emails",
  );
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const where: any = {};

  if (
    typeof params?.recipient_email === "string" &&
    params.recipient_email.trim()
  ) {
    where.recipient_email = {
      contains: params.recipient_email.trim(),
      mode: "insensitive",
    };
  }
  if (typeof params?.subject === "string" && params.subject.trim()) {
    where.subject = { contains: params.subject.trim(), mode: "insensitive" };
  }
  if (typeof params?.order_number === "string" && params.order_number.trim()) {
    where.order_number = {
      contains: params.order_number.trim(),
      mode: "insensitive",
    };
  }
  if (typeof params?.status === "string" && params.status.trim()) {
    where.status = params.status.trim();
  }
  if (typeof params?.type === "string" && params.type.trim()) {
    where.type = params.type.trim();
  }

  const { emailsRaw, totalEmails } =
    await getSentEmailsDashboardDataInDB(where, skipCount, pageSize);

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
        filterParams={params as any}
        permissions={permissions}
        totalCount={totalEmails}
      />

      <Pagination
        totalItems={totalEmails}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="email logs"
      />
    </div>
  );
}
