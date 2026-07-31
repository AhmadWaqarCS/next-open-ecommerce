"use client";

import { useState, useTransition } from "react";
import { generateAndSendInvoiceAction } from "@/actions/invoice-actions";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import {
  generateInvoicePdfFromData,
  InvoicePdfData,
} from "@/lib/client-pdf";

interface InvoiceActionsHeaderProps {
  invoiceId: number;
  orderId: number;
  customerEmail: string;
  invoiceNumber: string;
  pdfData?: InvoicePdfData;
}

export default function InvoiceActionsHeader({
  invoiceId,
  orderId,
  customerEmail,
  invoiceNumber,
  pdfData,
}: InvoiceActionsHeaderProps) {
  const [isPending, startTransition] = useTransition();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const { toast } = useToast();

  const handleDownloadPdf = async () => {
    if (!pdfData) {
      toast("Invoice data unavailable for PDF generation.", "error");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const res = await generateInvoicePdfFromData(
        pdfData,
        `${invoiceNumber}.pdf`,
      );
      if (res.success) {
        toast("Invoice PDF generated and downloaded successfully.", "success");
      } else {
        toast(res.error || "Failed to generate PDF.", "error");
      }
    } catch (err: any) {
      toast(err?.message || "Failed to generate PDF.", "error");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendEmail = () => {
    startTransition(async () => {
      const res = await generateAndSendInvoiceAction(orderId);
      setShowSendModal(false);
      if (res.success) {
        toast(res.message || "Invoice email sent successfully.", "success");
      } else {
        toast(res.message || "Failed to send invoice email.", "error");
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          title="Download PDF Document"
        >
          {isGeneratingPdf ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-indigo-600 dark:text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Generating PDF...
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4 text-indigo-600 dark:text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download PDF
            </>
          )}
        </button>

        <button
          onClick={() => setShowSendModal(true)}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
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
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          {isPending ? "Sending..." : "Resend Email"}
        </button>
      </div>

      <Modal isOpen={showSendModal} onClose={() => setShowSendModal(false)}>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Resend Invoice Email
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Send the invoice PDF document directly to the customer.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Are you sure you want to resend invoice{" "}
            <span className="font-bold text-zinc-800 dark:text-zinc-100">
              {invoiceNumber}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {customerEmail}
            </span>
            ?
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setShowSendModal(false)}
              className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSendEmail}
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? "Sending..." : "Send Email"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
