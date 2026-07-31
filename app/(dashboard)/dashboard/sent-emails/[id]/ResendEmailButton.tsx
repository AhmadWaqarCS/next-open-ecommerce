"use client";

import { useState, useTransition } from "react";
import { resendEmailAction } from "@/actions/sent-email-actions";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";

interface ResendEmailButtonProps {
  sentEmailId: number;
  recipientEmail: string;
  subject: string;
}

export default function ResendEmailButton({
  sentEmailId,
  recipientEmail,
  subject,
}: ResendEmailButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  const handleConfirmResend = () => {
    startTransition(async () => {
      const res = await resendEmailAction(sentEmailId);
      setShowModal(false);
      if (res.success) {
        toast(res.message || "Email resent successfully.", "success");
      } else {
        toast(res.message || "Failed to resend email.", "error");
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
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
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {isPending ? "Resending..." : "Resend Email"}
      </button>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Resend Outbound Email
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Re-dispatch this email via Nodemailer integration.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Resend &quot;
            <span className="font-bold text-zinc-800 dark:text-zinc-100">
              {subject}
            </span>
            &quot; to{" "}
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {recipientEmail}
            </span>
            ?
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmResend}
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? "Resending..." : "Yes, Resend Email"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
