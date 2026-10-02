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
        toast.success(res.message || "Email resent successfully.");
      } else {
        toast.error(res.message || "Failed to resend email.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-dashboard-primary-fg bg-dashboard-primary hover:bg-dashboard-primary-hover rounded-xl transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
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
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-dashboard-fg">
              Resend Outbound Email
            </h3>
            <p className="text-xs text-dashboard-muted">
              Re-dispatch this email via Nodemailer integration.
            </p>
          </div>

          <p className="text-sm text-dashboard-fg leading-relaxed">
            Resend &ldquo;
            <span className="font-bold text-dashboard-fg">{subject}</span>
            &rdquo; to{" "}
            <span className="font-bold text-dashboard-primary font-mono">
              {recipientEmail}
            </span>
            ?
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-dashboard-border">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold rounded-xl hover:bg-dashboard-card-hover text-dashboard-muted hover:text-dashboard-fg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmResend}
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? "Resending..." : "Yes, Resend Email"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
