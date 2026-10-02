import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import Link from "next/link";
import { notFound } from "next/navigation";
import { assertPermission } from "@/lib/guards";
import ResendEmailButton from "./resend-email-button";
import { getSentEmailDetailsDataInDB } from "@/services/sent-email-services";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Sent Email #${id}`,
    description: `Audit and inspect outgoing email dispatch record #${id}`,
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SentEmailDetailPage(props: PageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <SentEmailDetailPageContent {...props} />
    </Suspense>
  );
}

function getTypeBadge(type: string) {
  switch (type) {
    case "marketing":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          Marketing
        </span>
      );
    case "newsletter":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
          Newsletter
        </span>
      );
    case "order":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent/20">
          Order
        </span>
      );
    case "support":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          Support
        </span>
      );
    case "invoice":
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-dashboard-primary/10 text-dashboard-primary border border-dashboard-primary/20">
          Invoice
        </span>
      );
  }
}

async function SentEmailDetailPageContent({ params }: PageProps) {
  await assertPermission("read", "/dashboard/sent-emails");
  const { id } = await params;

  const emailId = parseInt(id, 10);
  if (isNaN(emailId) || emailId < 1) {
    notFound();
  }

  const emailLog = await getSentEmailDetailsDataInDB(emailId);
  if (!emailLog) {
    notFound();
  }

  const isSuccess = emailLog.status === "successful";
  const isFailed = emailLog.status === "failed";

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard/sent-emails"
          className="inline-flex items-center gap-2 text-sm text-dashboard-muted hover:text-dashboard-fg font-semibold transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Sent Emails
        </Link>

        <ResendEmailButton
          sentEmailId={emailLog.id}
          recipientEmail={emailLog.recipient_email}
          subject={emailLog.subject}
        />
      </div>

      {/* Metadata Card */}
      <div className="bg-dashboard-card border border-dashboard-border rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dashboard-border-subtle pb-4">
          <div className="space-y-2">
            <div>{getTypeBadge(emailLog.type)}</div>
            <h1 className="text-xl font-bold text-dashboard-fg">
              {emailLog.subject}
            </h1>
          </div>

          <span
            className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
              isSuccess
                ? "bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent/30"
                : isFailed
                  ? "bg-dashboard-danger-subtle text-dashboard-danger-fg border border-dashboard-danger/30"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
            }`}
          >
            {emailLog.status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-xs">
          <div>
            <span className="font-bold text-dashboard-muted uppercase tracking-wider block mb-1">
              Recipient
            </span>
            <span className="font-semibold text-dashboard-fg text-sm block">
              {emailLog.recipient_name || emailLog.recipient_email}
            </span>
            {emailLog.recipient_name && (
              <span className="text-dashboard-muted font-mono block">
                {emailLog.recipient_email}
              </span>
            )}
          </div>

          <div>
            <span className="font-bold text-dashboard-muted uppercase tracking-wider block mb-1">
              Sender
            </span>
            <span className="font-semibold text-dashboard-fg text-sm block font-mono">
              {emailLog.sender_email}
            </span>
          </div>

          <div>
            <span className="font-bold text-dashboard-muted uppercase tracking-wider block mb-1">
              Associated References
            </span>
            {emailLog.order_number && (
              <span className="text-dashboard-fg block font-mono">
                Order #{emailLog.order_number}
              </span>
            )}
            {emailLog.invoice && (
              <Link
                href={`/dashboard/invoices/${emailLog.invoice.id}`}
                className="text-dashboard-primary hover:underline font-mono block font-semibold"
              >
                Invoice #{emailLog.invoice.invoice_number}
              </Link>
            )}
            {!emailLog.order_number && !emailLog.invoice && (
              <span className="text-dashboard-muted italic">None</span>
            )}
          </div>

          <div>
            <span className="font-bold text-dashboard-muted uppercase tracking-wider block mb-1">
              Dispatched Time
            </span>
            <span className="font-semibold text-dashboard-fg text-sm block">
              {emailLog.sent_at
                ? new Date(emailLog.sent_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Pending"}
            </span>
          </div>
        </div>

        {emailLog.error_message && (
          <div className="p-4 bg-dashboard-danger-subtle border border-dashboard-danger/20 rounded-xl space-y-1">
            <h4 className="text-xs font-bold text-dashboard-danger uppercase tracking-wider">
              Transmission Note
            </h4>
            <p className="text-xs font-mono text-dashboard-fg whitespace-pre-wrap">
              {emailLog.error_message}
            </p>
          </div>
        )}
      </div>

      {/* HTML Render Preview Container */}
      <div className="bg-dashboard-card border border-dashboard-border rounded-2xl overflow-hidden shadow-xs space-y-3 flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-dashboard-border bg-dashboard-muted-bg flex items-center justify-between">
          <h3 className="text-sm font-bold text-dashboard-fg flex items-center gap-2">
            <svg
              className="h-4 w-4 text-dashboard-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            Rendered HTML Email Body Preview
          </h3>
          <span className="text-xs text-dashboard-muted font-medium">
            Permanent Dispatched Snapshot
          </span>
        </div>

        <div className="p-4 bg-dashboard-bg flex-1">
          <iframe
            srcDoc={emailLog.body_html}
            title="Email Preview"
            className="w-full h-[650px] border border-dashboard-border rounded-xl bg-white shadow-xs"
            sandbox="allow-popups allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
