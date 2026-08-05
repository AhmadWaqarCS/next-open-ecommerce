"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "../../_components/toast-context";
import { updateEmailConfig, verifyEmailConfigAction } from "@/actions/email-config-actions";
import {
  EmailConfigUpdateInput,
  emailConfigUpdateSchema,
} from "@/lib/validations";
import { CRUD } from "@/lib/types";

interface EmailConfigFormProps {
  initialData: any;
  permissions: CRUD;
}

const TABS = [
  { id: "general", label: "General & Sender", icon: "✉️" },
  { id: "env_config", label: "SMTP & Environment", icon: "⚙️" },
  { id: "notifications", label: "Notifications & Rules", icon: "🔔" },
];

const ENV_SNIPPET = `# Email Server Configuration (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=user@example.com
SMTP_PASS=your_smtp_password`;

export default function EmailConfigForm({
  initialData,
  permissions,
}: EmailConfigFormProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [isPending, startTransition] = useTransition();
  const [isVerifying, startVerifyTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
    reset,
  } = useForm<EmailConfigUpdateInput>({
    resolver: zodResolver(emailConfigUpdateSchema),
    defaultValues: {
      provider: initialData.provider || "smtp",
      from_name: initialData.from_name || "",
      from_email: initialData.from_email || "",
      reply_to_email: initialData.reply_to_email || "",
      send_order_confirmation: initialData.send_order_confirmation ?? true,
      send_shipping_update: initialData.send_shipping_update ?? true,
      send_admin_new_order: initialData.send_admin_new_order ?? true,
      admin_notification_email: initialData.admin_notification_email || "",
      include_pdf_invoice: initialData.include_pdf_invoice ?? false,
      is_active: initialData.is_active ?? true,
    },
  });

  const sendAdminNewOrder = watch("send_admin_new_order");

  const handleVerifySmtp = () => {
    startVerifyTransition(async () => {
      const res = await verifyEmailConfigAction();
      if (res.success) {
        toast(res.message || "SMTP server connection verified successfully!", "success");
      } else {
        toast(res.message || "Failed to connect to SMTP server.", "error");
      }
    });
  };

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(ENV_SNIPPET);
    setCopied(true);
    toast("Environment variables snippet copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const onSubmit = (data: EmailConfigUpdateInput) => {
    if (!permissions.update) {
      toast("You do not have permission to update email configuration.", "error");
      return;
    }

    setGlobalError(null);
    startTransition(async () => {
      const response = await updateEmailConfig(initialData.id, data);
      if (!response.success) {
        if (response.message) setGlobalError(response.message);
        toast(response.message || "Failed to update email configuration.", "error");
        return;
      }

      reset(data);
      toast("Email configuration updated successfully.", "success");
    });
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl gap-4">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${isDirty ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}></div>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {isDirty ? "Unsaved changes detected" : "Configuration is up to date"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            disabled={!isDirty || isPending}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              isDirty && !isPending
                ? "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800"
                : "text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-transparent"
            }`}
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={!isDirty || isPending || !permissions.update}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-md ${
              isDirty && permissions.update
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10 active:scale-[0.98]"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed shadow-none"
            }`}
          >
            {isPending ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                Saving Changes...
              </>
            ) : (
              "Save Configuration"
            )}
          </button>
        </div>
      </div>

      {globalError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 font-medium"
        >
          {globalError}
        </div>
      )}

      {hasErrors && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400 font-medium"
        >
          Please check the tabs for validation errors.
        </div>
      )}

      {/* Sub Horizontal Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Contents Panel */}
      <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs min-h-[450px]">
        {/* TAB 1: GENERAL & SENDER */}
        {activeTab === "general" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Sender Identity
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Configure default sender info and active email client provider.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  From Name *
                </label>
                <input
                  type="text"
                  disabled={!permissions.update}
                  {...register("from_name")}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50/30 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm"
                  placeholder="Luma Store"
                />
                {errors.from_name && (
                  <p className="mt-1 text-xs text-red-500 font-medium">
                    {errors.from_name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  From Email Address *
                </label>
                <input
                  type="email"
                  disabled={!permissions.update}
                  {...register("from_email")}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50/30 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm"
                  placeholder="orders@luma.store"
                />
                {errors.from_email && (
                  <p className="mt-1 text-xs text-red-500 font-medium">
                    {errors.from_email.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Reply-To Email Address
                </label>
                <input
                  type="email"
                  disabled={!permissions.update}
                  {...register("reply_to_email")}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50/30 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm"
                  placeholder="support@luma.store"
                />
                {errors.reply_to_email && (
                  <p className="mt-1 text-xs text-red-500 font-medium">
                    {errors.reply_to_email.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Email Client Provider
                </label>
                <select
                  disabled={!permissions.update}
                  {...register("provider")}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50/30 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none text-sm"
                >
                  <option value="smtp">Standard SMTP Server</option>
                  <option value="resend">Resend (API)</option>
                  <option value="sendgrid">SendGrid (API)</option>
                  <option value="ses">Amazon SES</option>
                </select>
                {errors.provider && (
                  <p className="mt-1 text-xs text-red-500 font-medium">
                    {errors.provider.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SMTP & ENVIRONMENT */}
        {activeTab === "env_config" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  SMTP & Environment Configuration
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  All SMTP connection parameters, passwords, and API credentials are read securely from server environment variables (<code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">.env</code>).
                </p>
              </div>

              <button
                type="button"
                onClick={handleVerifySmtp}
                disabled={isVerifying || !permissions.update}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-900/40 rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isVerifying ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-emerald-600 dark:text-emerald-400"
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
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Verify Email Connection
                  </>
                )}
              </button>
            </div>

            {/* Information Card */}
            <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
              <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                <p className="font-semibold">Security & Privacy Protocol</p>
                <p className="text-indigo-700 dark:text-indigo-300">
                  Passwords and server secrets are never exposed on the client side or stored in the database. Add the environment variables below to your server&apos;s <code className="font-mono bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.5 rounded">.env</code> file, then click <strong>Verify Email Connection</strong> to test the server setup.
                </p>
              </div>
            </div>

            {/* Code Snippet Box */}
            <div className="relative rounded-xl bg-zinc-950 border border-zinc-800 p-4 font-mono text-xs text-zinc-100 overflow-x-auto shadow-inner">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 text-zinc-400 font-sans">
                <span className="flex items-center gap-2 text-xs font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Required .env Configuration
                </span>
                <button
                  type="button"
                  onClick={handleCopyEnv}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all text-xs cursor-pointer font-mono"
                >
                  {copied ? (
                    <>
                      <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Snippet
                    </>
                  )}
                </button>
              </div>
              <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed">
                {ENV_SNIPPET}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: NOTIFICATIONS & RULES */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Notification Triggers
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Select which notification alerts should fire on store order events.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-150 dark:border-zinc-800 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="send_order_confirmation"
                  disabled={!permissions.update}
                  {...register("send_order_confirmation")}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1 select-none">
                  <label htmlFor="send_order_confirmation" className="text-sm font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer">
                    Customer Order Confirmation
                  </label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Sends confirmation receipt and summary to customer immediately after checkout.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-150 dark:border-zinc-800 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="send_shipping_update"
                  disabled={!permissions.update}
                  {...register("send_shipping_update")}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1 select-none">
                  <label htmlFor="send_shipping_update" className="text-sm font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer">
                    Customer Shipping Update
                  </label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Sends shipment notification with tracking ID once package is marked fulfilled.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-150 dark:border-zinc-800 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="include_pdf_invoice"
                  disabled={!permissions.update}
                  {...register("include_pdf_invoice")}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1 select-none">
                  <label htmlFor="include_pdf_invoice" className="text-sm font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer">
                    Include PDF Invoice
                  </label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Auto-generate and attach formal PDF receipt to client emails.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-150 dark:border-zinc-800 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  disabled={!permissions.update}
                  {...register("is_active")}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1 select-none">
                  <label htmlFor="is_active" className="text-sm font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer">
                    Global Email Status Active
                  </label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Toggle whether standard email notifications should be dispatched by this store client.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/10 border border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="send_admin_new_order"
                    disabled={!permissions.update}
                    {...register("send_admin_new_order")}
                    className="mt-1 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1 select-none">
                    <label htmlFor="send_admin_new_order" className="text-sm font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer">
                      Admin Notification (New Orders)
                    </label>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Sends a new order alert to store manager/admin inbox.
                    </p>
                  </div>
                </div>

                {sendAdminNewOrder && (
                  <div className="pl-7 animate-fade-in">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      Admin Target Notification Email
                    </label>
                    <input
                      type="email"
                      disabled={!permissions.update}
                      {...register("admin_notification_email")}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50/30 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm"
                      placeholder="admin@luma.store"
                    />
                    {errors.admin_notification_email && (
                      <p className="mt-1 text-xs text-red-500 font-medium">
                        {errors.admin_notification_email.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
