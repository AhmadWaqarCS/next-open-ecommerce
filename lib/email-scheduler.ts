import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import { updateCampaignRecipientStatusInDB } from "@/services/email-campaign-services";
import { createSentEmailInDB, updateSentEmailInDB } from "@/services/email-services";
import { renderEmailTemplate } from "@/lib/email-template-engine";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeCampaignSendingEngine(campaignId: number, retryFailedOnly = false) {
  const campaign = await prisma.email_campaign.findUnique({
    where: { id: campaignId },
    include: {
      email_config: true,
      template: true,
      recipients: {
        include: {
          customer_contact: true,
        },
      },
    },
  });

  if (!campaign) {
    console.error(`[CampaignEngine] Campaign #${campaignId} not found.`);
    return { success: false, message: "Campaign not found" };
  }

  // Update campaign status to sending
  await prisma.email_campaign.update({
    where: { id: campaignId },
    data: { status: "sending" },
  });

  // Get active email config (specified on campaign or fallback to active marketing config)
  let emailConfig = campaign.email_config;
  if (!emailConfig) {
    emailConfig = await prisma.email_config.findFirst({
      where: { purpose: "marketing", is_active: true, deleted_at: null },
    });
  }
  if (!emailConfig) {
    emailConfig = await prisma.email_config.findFirst({
      where: { is_active: true, deleted_at: null },
    });
  }

  const siteConfig = await prisma.site_config.findFirst({
    where: { deleted_at: null },
    select: { name: true, email: true },
  });

  const fromName = emailConfig?.from_name || siteConfig?.name || "Store Marketing";
  const fromEmail = emailConfig?.from_email || siteConfig?.email || "marketing@example.com";
  const replyTo = emailConfig?.reply_to_email || fromEmail;
  const timeDelayMs = emailConfig?.time_delay_ms ?? 1000;

  const { getSmtpEnvVarsForPurpose } = await import("./email-smtp-config");
  const { host, port, secure, user, pass, envKeys } = getSmtpEnvVarsForPurpose(
    emailConfig?.purpose || "marketing",
  );

  if (!host) {
    const errorMsg = "No active SMTP host configured for email campaigns.";
    console.error(`[CampaignEngine] ${errorMsg}`);
    await prisma.email_campaign.update({
      where: { id: campaignId },
      data: { status: "failed" },
    });
    return { success: false, message: errorMsg };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: pass ? { user: user || "", pass } : undefined,
    connectionTimeout: 8000,
    socketTimeout: 15000,
  });

  // Filter target recipients based on retryFailedOnly option
  const targetRecipients = retryFailedOnly
    ? campaign.recipients.filter((r) => r.status === "failed")
    : campaign.recipients.filter((r) => r.status === "pending" || r.status === "failed");

  let sentCount = campaign.sent_count;
  let failedCount = 0;

  for (const recipient of targetRecipients) {
    const contact = recipient.customer_contact;

    // UNSUBSCRIBED FILTER GUARANTEE: Never send to unsubscribed recipients!
    if (contact.is_unsubscribed) {
      await updateCampaignRecipientStatusInDB(
        recipient.id,
        "failed",
        "Skipped: Recipient has unsubscribed from marketing emails.",
      );
      failedCount++;
      continue;
    }

    // Determine subject and HTML body
    let rawSubject =
      campaign.strategy === "per_recipient" && recipient.custom_subject
        ? recipient.custom_subject
        : campaign.subject || campaign.template?.subject || "Update from Store";

    let rawBodyHtml =
      campaign.strategy === "per_recipient" && recipient.custom_body_html
        ? recipient.custom_body_html
        : campaign.body_html || campaign.template?.body_html || "<p>Hello</p>";

    // Replace customer variables
    const recipientName =
      [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Valued Customer";

    const variables: Record<string, string> = {
      customer_name: recipientName,
      first_name: contact.first_name || "Customer",
      last_name: contact.last_name || "",
      email: contact.email,
    };

    const { subject: finalSubject, bodyHtml: finalBodyHtml } =
      renderEmailTemplate(rawBodyHtml, rawSubject, variables);

    // Create Sent Email audit log record
    const sentRecord = await createSentEmailInDB({
      type: "marketing_campaign",
      sender_email: fromEmail,
      recipient_email: contact.email,
      recipient_name: recipientName,
      subject: finalSubject,
      status: "pending",
      body_html: finalBodyHtml,
    });

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        replyTo,
        to: `"${recipientName}" <${contact.email}>`,
        subject: finalSubject,
        html: finalBodyHtml,
      });

      await updateSentEmailInDB(sentRecord.id, {
        status: "successful",
        sent_at: new Date(),
      });

      await updateCampaignRecipientStatusInDB(recipient.id, "sent");
      sentCount++;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.error(`[CampaignEngine] Failed to send to ${contact.email}:`, errMsg);

      await updateSentEmailInDB(sentRecord.id, {
        status: "failed",
        error_message: errMsg,
      });

      await updateCampaignRecipientStatusInDB(recipient.id, "failed", errMsg);
      failedCount++;
    }

    // Enforce rate delay between emails
    if (timeDelayMs > 0) {
      await sleep(timeDelayMs);
    }
  }

  const finalStatus =
    failedCount === 0
      ? "completed"
      : sentCount === 0
      ? "failed"
      : "partially_failed";

  await prisma.email_campaign.update({
    where: { id: campaignId },
    data: {
      status: finalStatus,
      sent_at: sentCount > 0 ? new Date() : undefined,
    },
  });

  return {
    success: true,
    sentCount,
    failedCount,
    status: finalStatus,
  };
}

export async function processDueScheduledCampaigns() {
  const now = new Date();
  const dueCampaigns = await prisma.email_campaign.findMany({
    where: {
      status: "scheduled",
      scheduled_at: {
        lte: now,
      },
    },
  });

  const results = [];
  for (const campaign of dueCampaigns) {
    console.log(`[ScheduledCampaigns] Processing due campaign #${campaign.id}: ${campaign.name}`);
    const res = await executeCampaignSendingEngine(campaign.id);
    results.push({ campaignId: campaign.id, ...res });
  }

  return results;
}
