import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import Link from "next/link";
import { notFound } from "next/navigation";
import { assertPermission } from "@/lib/guards";
import ResendEmailButton from "./ResendEmailButton";
import { getSentEmailDetailsDataInDB } from "@/services/email-services";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: `Sent Email #${id}`,
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

async function SentEmailDetailPageContent({
  params,
}: PageProps) {
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
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard/sent-emails"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
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
          Back to Email Logs
        </Link>

        <ResendEmailButton
          sentEmailId={emailLog.id}
          recipientEmail={emailLog.recipient_email}
          subject={emailLog.subject}
        />
      </div>

      {/* Metadata Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              {emailLog.type}
            </span>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
              {emailLog.subject}
            </h1>
          </div>

          <span
            className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
              isSuccess
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                : isFailed
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
            }`}
          >
            {emailLog.status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="font-bold text-zinc-400 uppercase tracking-wider block">
              Recipient
            </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm block">
              {emailLog.recipient_email}
            </span>
            {emailLog.recipient_name && (
              <span className="text-zinc-500">{emailLog.recipient_name}</span>
            )}
          </div>

          <div>
            <span className="font-bold text-zinc-400 uppercase tracking-wider block">
              Sender
            </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm block">
              {emailLog.sender_email}
            </span>
          </div>

          <div>
            <span className="font-bold text-zinc-400 uppercase tracking-wider block">
              References
            </span>
            {emailLog.order_number && (
              <span className="text-zinc-700 dark:text-zinc-300 block font-mono">
                Order #{emailLog.order_number}
              </span>
            )}
            {emailLog.invoice && (
              <Link
                href={`/dashboard/invoices/${emailLog.invoice.id}`}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono block"
              >
                Invoice {emailLog.invoice.invoice_number}
              </Link>
            )}
            {!emailLog.order_number && !emailLog.invoice && (
              <span className="text-zinc-400">None</span>
            )}
          </div>

          <div>
            <span className="font-bold text-zinc-400 uppercase tracking-wider block">
              Dispatched Time
            </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100 block text-sm">
              {emailLog.sent_at
                ? new Date(emailLog.sent_at).toLocaleString()
                : "Pending"}
            </span>
          </div>
        </div>

        {/* Error log callout if failed */}
        {emailLog.error_message && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-lg space-y-1">
            <h4 className="text-xs font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider">
              Dispatch Error Log
            </h4>
            <p className="text-xs font-mono text-rose-700 dark:text-rose-300 whitespace-pre-wrap">
              {emailLog.error_message}
            </p>
          </div>
        )}
      </div>

      {/* HTML Render Preview Container */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs space-y-3 flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <svg
              className="h-4 w-4 text-indigo-500"
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
            HTML Email Body Preview
          </h3>
          <span className="text-xs text-zinc-500">Rendered snapshot</span>
        </div>

        <div className="p-4 bg-zinc-100 dark:bg-zinc-950 flex-1">
          <iframe
            srcDoc={emailLog.body_html}
            title="Email Preview"
            className="w-full h-[650px] border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white shadow-xs"
            sandbox="allow-popups allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
