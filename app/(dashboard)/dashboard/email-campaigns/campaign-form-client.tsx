"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createEmailCampaignAction,
  updateEmailCampaignAction,
  sendCampaignNowAction,
  scheduleEmailCampaignAction,
  updateRecipientCustomContentAction,
} from "@/actions/email-campaign-actions";

interface Config {
  id: number;
  name: string;
  purpose: string;
  from_email: string;
  is_active: boolean;
}

interface Template {
  id: number;
  name: string;
  subject: string;
  body_html: string;
}

interface Group {
  id: number;
  name: string;
  member_count: number;
}

interface Recipient {
  id: number;
  custom_subject: string | null;
  custom_body_html: string | null;
  status: string;
  error_message: string | null;
  contact: {
    id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
    is_unsubscribed: boolean;
  };
}

interface Campaign {
  id: number;
  name: string;
  strategy: "single" | "per_recipient";
  subject: string | null;
  body_html: string | null;
  status: string;
  email_config_id: number | null;
  template_id: number | null;
  scheduled_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  recipients: Recipient[];
}

interface CampaignFormClientProps {
  campaign?: Campaign;
  configs: Config[];
  templates: Template[];
  groups: Group[];
}

export default function CampaignFormClient({
  campaign,
  configs,
  templates,
  groups,
}: CampaignFormClientProps) {
  const router = useRouter();
  const isEditing = Boolean(campaign);
  const isLocked = Boolean(campaign && campaign.sent_count > 0);

  const [name, setName] = useState(campaign?.name || "");
  const [strategy, setStrategy] = useState<"single" | "per_recipient">(
    campaign?.strategy || "single",
  );
  const [subject, setSubject] = useState(campaign?.subject || "");
  const [bodyHtml, setBodyHtml] = useState(campaign?.body_html || "");
  const [emailConfigId, setEmailConfigId] = useState(
    campaign?.email_config_id?.toString() || "",
  );
  const [templateId, setTemplateId] = useState(
    campaign?.template_id?.toString() || "",
  );
  const [groupId, setGroupId] = useState("");
  const [scheduledAt, setScheduledAt] = useState(
    campaign?.scheduled_at ? campaign.scheduled_at.substring(0, 16) : "",
  );

  // Per-Recipient Custom Editor State
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(
    campaign?.recipients[0]?.id || null,
  );
  const [customSubjInput, setCustomSubjInput] = useState("");
  const [customBodyInput, setCustomBodyInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [savingRecipient, setSavingRecipient] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Timezone display calculations
  const [userTimezone, setUserTimezone] = useState<string>("UTC");
  const [utcTimeDisplay, setUtcTimeDisplay] = useState<string>("");

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(tz || "UTC");
    } catch {}
  }, []);

  useEffect(() => {
    if (scheduledAt) {
      const dateObj = new Date(scheduledAt);
      if (!isNaN(dateObj.getTime())) {
        setUtcTimeDisplay(dateObj.toUTCString());
      } else {
        setUtcTimeDisplay("");
      }
    } else {
      setUtcTimeDisplay("");
    }
  }, [scheduledAt]);

  const activeRecipient = campaign?.recipients.find((r) => r.id === selectedRecipientId);

  useEffect(() => {
    if (activeRecipient) {
      setCustomSubjInput(activeRecipient.custom_subject || "");
      setCustomBodyInput(activeRecipient.custom_body_html || "");
    }
  }, [selectedRecipientId]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleTemplateChange = (idStr: string) => {
    setTemplateId(idStr);
    if (!idStr) return;
    const selected = templates.find((t) => t.id === Number(idStr));
    if (selected) {
      if (!subject) setSubject(selected.subject);
      if (!bodyHtml) setBodyHtml(selected.body_html);
    }
  };

  const getUpdatePayload = () => ({
    name,
    strategy,
    subject: subject || null,
    body_html: bodyHtml || null,
    email_config_id: emailConfigId ? Number(emailConfigId) : null,
    template_id: templateId ? Number(templateId) : null,
    scheduled_at: scheduledAt || null,
  });

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      showToast("Locked Campaign: Cannot edit a campaign with active sent history.", "error");
      return;
    }

    setLoading(true);
    const payload = {
      ...getUpdatePayload(),
      group_id: groupId ? Number(groupId) : undefined,
    };

    if (isEditing && campaign) {
      const res = await updateEmailCampaignAction(campaign.id, payload);
      setLoading(false);
      if (res.success) {
        showToast("Campaign draft updated.");
        router.refresh();
      } else {
        showToast(res.message || "Failed to update draft.", "error");
      }
    } else {
      const res = await createEmailCampaignAction(payload);
      setLoading(false);
      if (res.success && res.campaignId) {
        showToast("Campaign created!");
        router.push(`/dashboard/email-campaigns/${res.campaignId}`);
      } else {
        showToast(res.message || "Failed to create campaign.", "error");
      }
    }
  };

  const handleSendNow = async () => {
    if (!campaign) return;
    setLoading(true);

    if (!isLocked) {
      const updateRes = await updateEmailCampaignAction(campaign.id, getUpdatePayload());
      if (!updateRes.success) {
        setLoading(false);
        showToast(updateRes.message || "Failed to update campaign before sending.", "error");
        return;
      }
    }

    const res = await sendCampaignNowAction(campaign.id);
    setLoading(false);

    if (res.success) {
      showToast("Campaign execution started in background!");
      router.refresh();
    } else {
      showToast(res.message || "Failed to trigger send.", "error");
    }
  };

  const handleScheduleSubmit = async () => {
    if (!campaign || !scheduledAt) return;
    setLoading(true);

    if (!isLocked) {
      const updateRes = await updateEmailCampaignAction(campaign.id, getUpdatePayload());
      if (!updateRes.success) {
        setLoading(false);
        showToast(updateRes.message || "Failed to update campaign before scheduling.", "error");
        return;
      }
    }

    const res = await scheduleEmailCampaignAction(campaign.id, scheduledAt);
    setLoading(false);

    if (res.success) {
      showToast(res.message || "Campaign scheduled successfully!");
      router.refresh();
    } else {
      showToast(res.message || "Scheduling failed.", "error");
    }
  };

  const handleSaveActiveRecipientContent = async () => {
    if (!activeRecipient) return;

    setSavingRecipient(true);
    const res = await updateRecipientCustomContentAction({
      recipient_id: activeRecipient.id,
      custom_subject: customSubjInput.trim() || null,
      custom_body_html: customBodyInput.trim() || null,
    });
    setSavingRecipient(false);

    if (res.success) {
      showToast(`Custom content saved for ${activeRecipient.contact.email}.`);
      router.refresh();
    } else {
      showToast(res.message || "Failed to update recipient content.", "error");
    }
  };

  const handleResetActiveRecipientContent = async () => {
    if (!activeRecipient) return;

    setSavingRecipient(true);
    const res = await updateRecipientCustomContentAction({
      recipient_id: activeRecipient.id,
      custom_subject: null,
      custom_body_html: null,
    });
    setSavingRecipient(false);

    if (res.success) {
      setCustomSubjInput("");
      setCustomBodyInput("");
      showToast(`Reset ${activeRecipient.contact.email} to default broadcast content.`);
      router.refresh();
    } else {
      showToast(res.message || "Failed to reset recipient content.", "error");
    }
  };

  const handleCycleRecipient = (direction: "prev" | "next") => {
    if (!campaign || campaign.recipients.length === 0) return;
    const currentIndex = campaign.recipients.findIndex((r) => r.id === selectedRecipientId);
    if (currentIndex === -1) return;

    let targetIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex < 0) targetIndex = campaign.recipients.length - 1;
    if (targetIndex >= campaign.recipients.length) targetIndex = 0;

    setSelectedRecipientId(campaign.recipients[targetIndex].id);
  };

  return (
    <div className="space-y-8">
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
        <Link
          href="/dashboard/email-campaigns"
          className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 mb-2"
        >
          ← Back to Campaigns
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {isEditing ? `Campaign #${campaign?.id}: ${campaign?.name}` : "Create New Campaign"}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Configure content strategy, recipient lists, email config, and scheduling
            </p>
          </div>

          {isLocked && (
            <div className="px-4 py-2 bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 text-xs font-bold rounded-xl border border-amber-300 dark:border-amber-800 flex items-center gap-2">
              🔒 Locked: Emails have been sent. Editing & deletion are permanently disabled.
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSaveDraft} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Campaign Configuration */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                1. Campaign Details & Strategy
              </h3>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  required
                  disabled={isLocked}
                  placeholder="e.g. End of Season Flash Sale"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  Email Content Strategy
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => setStrategy("single")}
                    className={`p-4 rounded-xl border text-left transition ${
                      strategy === "single"
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100"
                        : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <div className="font-bold text-sm">Single Broadcast</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      Same subject and email body sent to all recipients.
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => setStrategy("per_recipient")}
                    className={`p-4 rounded-xl border text-left transition ${
                      strategy === "per_recipient"
                        ? "border-purple-600 bg-purple-50/50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-100"
                        : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <div className="font-bold text-sm">Per-Recipient Custom</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      Customize distinct subject & body for every recipient.
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Email Body & Template Editor */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                2. Default Email Subject & HTML Body
              </h3>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  Preset Template (Optional)
                </label>
                <select
                  disabled={isLocked}
                  value={templateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                >
                  <option value="">-- Load from Template --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  Default Broadcast Subject Line
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  placeholder="e.g. Exclusive Offer for {{customer_name}}"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  Default Broadcast HTML Email Body
                </label>
                <textarea
                  rows={8}
                  disabled={isLocked}
                  placeholder="<h2>Special Discount</h2><p>Hi {{customer_name}}, check out our new products!</p>"
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Sidebar Settings & Scheduling */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                3. Email Delivery Config
              </h3>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  SMTP Purpose Config
                </label>
                <select
                  disabled={isLocked}
                  value={emailConfigId}
                  onChange={(e) => setEmailConfigId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                >
                  <option value="">-- Active Marketing Config (Default) --</option>
                  {configs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.from_email}) {c.is_active ? "✓ Active" : "❌ Inactive"}
                    </option>
                  ))}
                </select>
              </div>

              {!isEditing && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">
                    Load Recipients from Email Group
                  </label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                  >
                    <option value="">-- Select Group --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.member_count} members)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  Schedule Execution Date & Time
                </label>
                <input
                  type="datetime-local"
                  disabled={isLocked}
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                />

                {utcTimeDisplay && (
                  <div className="mt-2 p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-xs space-y-1">
                    <div className="text-zinc-400">
                      Local Region ({userTimezone}):{" "}
                      <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                        {scheduledAt}
                      </span>
                    </div>
                    <div className="text-zinc-400">
                      Global UTC:{" "}
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {utcTimeDisplay}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {!isLocked && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold rounded-xl hover:bg-zinc-800 transition"
                >
                  {loading ? "Saving..." : isEditing ? "Save Campaign Draft" : "Create Campaign Draft"}
                </button>
              )}
            </div>

            {/* Execute Campaign Actions */}
            {isEditing && campaign && (
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Execution Actions
                </h3>

                <button
                  type="button"
                  onClick={handleSendNow}
                  disabled={loading || campaign.total_recipients === 0}
                  className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  🚀 Send Now to {campaign.total_recipients} Recipients
                </button>

                {scheduledAt && !isLocked && (
                  <button
                    type="button"
                    onClick={handleScheduleSubmit}
                    disabled={loading}
                    className="w-full py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition"
                  >
                    ⏰ Confirm Schedule Date
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Per-Recipient Content Customization System */}
      {isEditing && campaign && campaign.recipients.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm space-y-6 p-6">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Per-Recipient Content Customizer ({campaign.recipients.length})</span>
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                  {strategy === "per_recipient" ? "Active Mode" : "Optional Customization"}
                </span>
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Select a recipient to create or edit unique email subjects and HTML body content specifically for them.
              </p>
            </div>

            {/* Prev/Next Quick Cycler */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCycleRecipient("prev")}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 rounded-lg transition"
              >
                ◀ Prev Recipient
              </button>
              <button
                type="button"
                onClick={() => handleCycleRecipient("next")}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 rounded-lg transition"
              >
                Next Recipient ▶
              </button>
            </div>
          </div>

          {/* Recipient Selection Bar / Tabs */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Select Recipient to Customize:
            </label>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800">
              {campaign.recipients.map((r) => {
                const isSelected = r.id === selectedRecipientId;
                const hasCustom = Boolean(r.custom_subject || r.custom_body_html);
                const fullName = [r.contact.first_name, r.contact.last_name].filter(Boolean).join(" ");

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRecipientId(r.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                      isSelected
                        ? "bg-purple-600 text-white shadow"
                        : hasCustom
                        ? "bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200 hover:bg-purple-200"
                        : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                    }`}
                  >
                    <span>{fullName || r.contact.email}</span>
                    {hasCustom ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-400 text-black font-extrabold">
                        ✨ Custom
                      </span>
                    ) : (
                      <span className="text-[10px] opacity-70">📄 Default</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Recipient Custom Editor Drawer */}
          {activeRecipient ? (
            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-6 rounded-2xl border border-purple-200 dark:border-purple-900/40 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Editing Content for:{" "}
                    <span className="text-purple-600 dark:text-purple-400 font-mono">
                      {[activeRecipient.contact.first_name, activeRecipient.contact.last_name]
                        .filter(Boolean)
                        .join(" ") || activeRecipient.contact.email}
                    </span>
                  </h4>
                  <div className="text-xs text-zinc-500 font-mono">
                    Email: {activeRecipient.contact.email} | Send Status: {activeRecipient.status}
                  </div>
                </div>

                {Boolean(activeRecipient.custom_subject || activeRecipient.custom_body_html) && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-bold text-xs rounded-full self-start sm:self-auto">
                    ✨ Unique Custom Content Active
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">
                    Custom Subject Line for {activeRecipient.contact.email}
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    placeholder={`Fallback default: ${subject || "(No default subject)"}`}
                    value={customSubjInput}
                    onChange={(e) => setCustomSubjInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm"
                  />
                  <span className="text-[11px] text-zinc-400">
                    Leave blank to use the main campaign broadcast subject line.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">
                    Custom HTML Body Content for {activeRecipient.contact.email}
                  </label>
                  <textarea
                    rows={8}
                    disabled={isLocked}
                    placeholder={`Fallback default:\n${bodyHtml || "(No default body)"}`}
                    value={customBodyInput}
                    onChange={(e) => setCustomBodyInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono"
                  />
                  <span className="text-[11px] text-zinc-400">
                    Leave blank to use the main campaign broadcast HTML body.
                  </span>
                </div>
              </div>

              {!isLocked && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    disabled={savingRecipient}
                    onClick={handleResetActiveRecipientContent}
                    className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl transition"
                  >
                    ↩️ Revert to Default Content
                  </button>

                  <button
                    type="button"
                    disabled={savingRecipient}
                    onClick={handleSaveActiveRecipientContent}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition"
                  >
                    {savingRecipient ? "Saving Custom Content..." : "💾 Save Custom Content for This Recipient"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-400 text-sm">
              Please select a recipient above to edit their custom subject and body HTML.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
