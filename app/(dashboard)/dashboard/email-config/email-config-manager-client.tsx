"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateEmailConfig,
  verifyAndActivateEmailConfigAction,
} from "@/actions/email-config-actions";
import { CRUD } from "@/lib/types";
import { generateEnvSnippetForPurpose } from "@/lib/email-smtp-config";

interface Config {
  id: number;
  purpose: string;
  name: string;
  provider: string;
  from_name: string;
  from_email: string;
  reply_to_email: string | null;
  time_delay_ms: number;
  is_active: boolean;
}

interface EmailConfigManagerClientProps {
  configs: Config[];
  permissions: CRUD;
}

export default function EmailConfigManagerClient({
  configs,
  permissions,
}: EmailConfigManagerClientProps) {
  const router = useRouter();
  const [selectedConfigId, setSelectedConfigId] = useState<number>(
    configs[0]?.id || 1,
  );
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const activeConfig = configs.find((c) => c.id === selectedConfigId) || configs[0];

  const [formData, setFormData] = useState({
    from_name: activeConfig?.from_name || "",
    from_email: activeConfig?.from_email || "",
    reply_to_email: activeConfig?.reply_to_email || "",
    time_delay_ms: activeConfig?.time_delay_ms || 1000,
  });

  const activeEnvSnippet = generateEnvSnippetForPurpose(activeConfig?.purpose || "marketing");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSelectConfig = (config: Config) => {
    setSelectedConfigId(config.id);
    setFormData({
      from_name: config.from_name || "",
      from_email: config.from_email || "",
      reply_to_email: config.reply_to_email || "",
      time_delay_ms: config.time_delay_ms || 1000,
    });
  };

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(activeEnvSnippet);
    setCopied(true);
    showToast(`Environment variables snippet for ${activeConfig.name} copied to clipboard!`);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConfig) return;

    setLoadingId(activeConfig.id);

    const payload = {
      from_name: formData.from_name,
      from_email: formData.from_email,
      reply_to_email: formData.reply_to_email || undefined,
      time_delay_ms: Number(formData.time_delay_ms),
    };

    const res = await updateEmailConfig(activeConfig.id, payload);
    setLoadingId(null);

    if (res.success) {
      showToast(res.message || "Email configuration saved!");
      router.refresh();
    } else {
      showToast(res.message || "Failed to save configuration.", "error");
    }
  };

  const handleVerifyAndActivate = async (id: number) => {
    setVerifyingId(id);
    const res = await verifyAndActivateEmailConfigAction(id);
    setVerifyingId(null);

    if (res.success) {
      showToast(res.message || "Environment SMTP verified & config ACTIVATED!");
      router.refresh();
    } else {
      showToast(res.message || "Nodemailer verification failed.", "error");
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Multi-Purpose Email Configurations
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage sender identities, rate delay rules, and dedicated environment variables per purpose
        </p>
      </div>

      {/* Purpose Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {configs.map((config) => {
          const isSelected = config.id === selectedConfigId;

          return (
            <button
              key={config.id}
              onClick={() => handleSelectConfig(config)}
              className={`p-5 rounded-2xl border text-left transition space-y-2 ${
                isSelected
                  ? "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 shadow-md"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {config.purpose.replace("_", " ")}
                </span>
                {config.is_active ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    ✓ Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                    ❌ Inactive
                  </span>
                )}
              </div>
              <div className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                {config.name}
              </div>
              <div className="text-xs text-zinc-500 truncate">
                Sender: {config.from_email}
              </div>
            </button>
          );
        })}
      </div>

      {/* Configuration Form */}
      {activeConfig && (
        <div className="space-y-6">
          <form
            onSubmit={handleSave}
            className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {activeConfig.name} Sender Details
                </h2>
                <p className="text-xs text-zinc-500">
                  Purpose: <span className="font-mono font-semibold">{activeConfig.purpose}</span>
                </p>
              </div>

              <button
                type="button"
                disabled={verifyingId === activeConfig.id}
                onClick={() => handleVerifyAndActivate(activeConfig.id)}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition flex items-center gap-2"
              >
                {verifyingId === activeConfig.id ? (
                  "Verifying Purpose Environment Transport..."
                ) : (
                  <>⚡ Test Connection & Activate</>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  From Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.from_name}
                  onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  From Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.from_email}
                  onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  Reply-To Email Address
                </label>
                <input
                  type="email"
                  value={formData.reply_to_email}
                  onChange={(e) => setFormData({ ...formData, reply_to_email: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  Rate Delay Between Emails (ms)
                </label>
                <input
                  type="number"
                  min={0}
                  max={60000}
                  value={formData.time_delay_ms}
                  onChange={(e) => setFormData({ ...formData, time_delay_ms: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                />
                <span className="text-[11px] text-zinc-400">
                  Time pause per email sent to comply with SMTP provider rate limits.
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="submit"
                disabled={loadingId === activeConfig.id}
                className="px-5 py-2.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm font-bold rounded-xl hover:bg-zinc-800 transition"
              >
                {loadingId === activeConfig.id ? "Saving..." : "Save Sender Configuration"}
              </button>
            </div>
          </form>

          {/* Environment Variable Configuration Block */}
          <div className="bg-zinc-900 text-zinc-100 p-6 rounded-2xl border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🔒 Dedicated .env Credentials</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    {activeConfig.purpose.toUpperCase()}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Each email configuration purpose supports its own dedicated environment variables in your server <span className="font-mono text-indigo-400">.env</span> file (with global fallback support).
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyEnv}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-lg text-zinc-200 transition self-start sm:self-auto"
              >
                {copied ? "Copied!" : "📋 Copy Purpose .env Snippet"}
              </button>
            </div>

            <pre className="p-4 bg-black/60 rounded-xl text-xs font-mono text-emerald-400 border border-zinc-800 overflow-x-auto">
              {activeEnvSnippet}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
