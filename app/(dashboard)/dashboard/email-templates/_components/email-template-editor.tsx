"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EMAIL_USE_CASES, renderEmailTemplate } from "@/lib/email-template-engine";
import {
  createEmailTemplateAction,
  updateEmailTemplateAction,
  sendTestEmailAction,
} from "@/actions/email-template-actions";

export interface EmailTemplateFormData {
  id?: number;
  key: string;
  name: string;
  description?: string | null;
  subject: string;
  body_html: string;
  is_active: boolean;
}

interface EmailTemplateEditorProps {
  initialData?: EmailTemplateFormData;
  defaultKey?: string;
  isEditMode?: boolean;
}

export function EmailTemplateEditor({
  initialData,
  defaultKey = "invoice",
  isEditMode = false,
}: EmailTemplateEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [key, setKey] = useState<string>(initialData?.key || defaultKey);
  const [name, setName] = useState<string>(initialData?.name || "");
  const [description, setDescription] = useState<string>(initialData?.description || "");
  const [subject, setSubject] = useState<string>(
    initialData?.subject || EMAIL_USE_CASES.find((u) => u.key === defaultKey)?.defaultSubject || ""
  );
  const [bodyHtml, setBodyHtml] = useState<string>(initialData?.body_html || "");
  const [isActive, setIsActive] = useState<boolean>(initialData?.is_active || false);

  const [viewMode, setViewMode] = useState<"split" | "editor" | "preview">("split");
  const [testEmailRecipient, setTestEmailRecipient] = useState<string>("");
  const [showTestModal, setShowTestModal] = useState<boolean>(false);
  const [testSending, setTestSending] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedUseCase = useMemo(() => {
    return EMAIL_USE_CASES.find((u) => u.key === key) || EMAIL_USE_CASES[0];
  }, [key]);

  const handleUseCaseChange = (newKey: string) => {
    setKey(newKey);
    const uc = EMAIL_USE_CASES.find((u) => u.key === newKey);
    if (uc && !isEditMode) {
      if (!name) setName(`Custom ${uc.name}`);
      if (!subject) setSubject(uc.defaultSubject);
    }
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sample data map for live HTML rendering preview
  const sampleVariables: Record<string, any> = useMemo(() => {
    return {
      store_name: "Aura Commerce Store",
      store_email: "support@auracommerce.com",
      store_phone: "+1 (555) 234-5678",
      store_address: "742 Evergreen Terrace, Suite 400",
      logo_url: "",
      storefront_url: "https://auracommerce.com",
      invoice_number: "INV-2026-0801",
      order_number: "ORD-94821",
      customer_name: "Alexander Wright",
      customer_email: "alexander@example.com",
      issued_date: "August 6, 2026",
      payment_method: "Cash on Delivery (COD)",
      status_badge_text: "ISSUED / PENDING PAYMENT",
      status_badge_color: "#ca8a04",
      items_table: `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #18181b;">
            <strong>Wireless Noise-Canceling Headphones</strong><br/>
            <span style="font-size: 12px; color: #71717a;">Color: Midnight Black</span>
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #18181b; text-align: center;">1</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #18181b; text-align: right;">$149.00</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #18181b; text-align: right; font-weight: 600;">$149.00</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #18181b;">
            <strong>Ergonomic Leather Desk Pad</strong><br/>
            <span style="font-size: 12px; color: #71717a;">Size: Large</span>
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #18181b; text-align: center;">1</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #18181b; text-align: right;">$39.00</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #18181b; text-align: right; font-weight: 600;">$39.00</td>
        </tr>
      `,
      subtotal: "$188.00",
      discount_row: `<tr><td style="color: #16a34a;">Discount (WELCOME10):</td><td style="text-align: right; font-weight: 600; color: #16a34a;">-$18.80</td></tr>`,
      tax_row: "",
      shipping_cost: "Free",
      total: "$169.20",
      currency_symbol: "$",
      notes_section: `<div style="margin-top: 24px; padding: 16px; background-color: #f4f4f5; border-radius: 8px;"><div style="font-size:11px; font-weight:700; color:#71717a; text-transform:uppercase;">Notes</div><div style="font-size: 13px; color: #3f3f46;">Please leave package at the front porch if unavailable.</div></div>`,
      otp_code: "593810",
      expires_minutes: 10,
      order_details_url: "https://auracommerce.com/order/ORD-94821",
      to_email: "subscriber@example.com",
      confirmation_url: "https://auracommerce.com/verify-newsletter?token=sample-signed-token",
      year: new Date().getFullYear(),
    };
  }, []);

  const renderedPreview = useMemo(() => {
    return renderEmailTemplate(bodyHtml, subject, sampleVariables);
  }, [bodyHtml, subject, sampleVariables]);

  const insertVariableTag = (varName: string) => {
    const tag = `{{${varName}}}`;
    setBodyHtml((prev) => `${prev} ${tag}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !subject || !bodyHtml) {
      showToast("error", "Please fill in all required template fields.");
      return;
    }

    startTransition(async () => {
      const payload = {
        key,
        name,
        description,
        subject,
        body_html: bodyHtml,
        is_active: isActive,
      };

      const res = isEditMode && initialData?.id
        ? await updateEmailTemplateAction(initialData.id, payload)
        : await createEmailTemplateAction(payload);

      if (res.success) {
        showToast("success", res.message || "Template saved successfully.");
        router.push("/dashboard/email-templates");
        router.refresh();
      } else {
        showToast("error", res.message || "Failed to save template.");
      }
    });
  };

  const handleSendTest = async () => {
    if (!testEmailRecipient || !testEmailRecipient.includes("@")) {
      showToast("error", "Please enter a valid test recipient email address.");
      return;
    }

    if (!initialData?.id) {
      showToast("error", "Please save the template first before sending a test email.");
      return;
    }

    setTestSending(true);
    const res = await sendTestEmailAction(initialData.id, testEmailRecipient);
    setTestSending(false);

    if (res.success) {
      showToast("success", res.message || "Test email sent!");
      setShowTestModal(false);
    } else {
      showToast("error", res.message || "Failed to send test email.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl font-medium text-sm transition-all animate-bounce ${
            toastMessage.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/email-templates"
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              ← Templates
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-xs font-semibold text-zinc-500">{isEditMode ? "Edit Template" : "New Template"}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
            {isEditMode ? `Edit Template: ${initialData?.name}` : "Create Email Template"}
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {isEditMode && initialData?.id && (
            <button
              type="button"
              onClick={() => setShowTestModal(true)}
              className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs rounded-xl transition-all"
            >
              ✉ Send Test Email
            </button>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {isPending ? "Saving..." : isEditMode ? "Save Changes" : "Create Template"}
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Email Use Case
            </label>
            <select
              value={key}
              onChange={(e) => handleUseCaseChange(e.target.value)}
              disabled={isEditMode}
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            >
              {EMAIL_USE_CASES.map((uc) => (
                <option key={uc.key} value={uc.key}>
                  {uc.name} ({uc.key})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Template Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Customer Invoice"
              required
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
            Subject Line Template
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Invoice {{invoice_number}} for Order #{{order_number}} — {{store_name}}"
            required
            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono text-xs"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700"
            />
            <label htmlFor="isActiveToggle" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer">
              Set as active template for this use case
            </label>
          </div>

          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            {isActive
              ? "Activating this template will deactivate any other template for this use case."
              : "Keep inactive to test or save as draft."}
          </span>
        </div>
      </div>

      {/* Available Variables Pills Helper */}
      <div className="bg-zinc-900 text-zinc-100 p-5 rounded-2xl border border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Available Data Tags for {selectedUseCase.name}
          </h4>
          <span className="text-[11px] text-zinc-500">Click a tag pill to insert into body</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedUseCase.availableVariables.map((v) => (
            <button
              key={v.name}
              type="button"
              onClick={() => insertVariableTag(v.name)}
              title={v.description}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-mono text-xs font-semibold rounded-lg border border-zinc-700 transition-all flex items-center gap-1.5"
            >
              <span>{`{{${v.name}}}`}</span>
              <span className="text-[10px] text-zinc-400 font-sans font-normal opacity-75">({v.description})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Code Editor & Live Preview Panel */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Template HTML & Styling Editor
          </span>

          <div className="flex items-center gap-1 bg-zinc-200 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                viewMode === "split"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              Split View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("editor")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                viewMode === "editor"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              Code Only
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                viewMode === "preview"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              Preview Only
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[500px]">
          {/* HTML Code Textarea */}
          {(viewMode === "split" || viewMode === "editor") && (
            <div className={`p-4 border-r border-zinc-200 dark:border-zinc-800 ${viewMode === "editor" ? "col-span-2" : ""}`}>
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                placeholder="Enter email HTML template with CSS <style> blocks and {{tags}}..."
                rows={22}
                className="w-full p-4 bg-zinc-950 text-emerald-400 font-mono text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 leading-relaxed resize-y"
              />
            </div>
          )}

          {/* Live Preview Pane */}
          {(viewMode === "split" || viewMode === "preview") && (
            <div className={`p-4 bg-zinc-100 dark:bg-zinc-950 overflow-y-auto ${viewMode === "preview" ? "col-span-2" : ""}`}>
              <div className="bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden min-h-[480px]">
                <div className="p-3 bg-zinc-100 border-b border-zinc-200 text-xs font-mono text-zinc-600 flex items-center justify-between">
                  <span className="truncate">Subject: <strong>{renderedPreview.subject || subject}</strong></span>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Live Preview</span>
                </div>
                <div
                  className="p-4"
                  dangerouslySetInnerHTML={{ __html: renderedPreview.bodyHtml }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Send Test Email
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Send a test preview of this email template rendered with sample data to your inbox.
            </p>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Recipient Email Address
              </label>
              <input
                type="email"
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                placeholder="your.email@domain.com"
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testSending}
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-xs rounded-xl shadow-sm hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-50"
              >
                {testSending ? "Sending..." : "Send Test"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
