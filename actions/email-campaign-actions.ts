"use server";

import { assertPermission } from "@/lib/guards";
import { revalidateTag } from "next/cache";
import { ActionResponse, logActivity } from "@/lib/action-utils";
import { after } from "next/server";
import {
  emailCampaignCreateSchema,
  emailCampaignUpdateSchema,
  recipientCustomContentSchema,
} from "@/lib/validations";
import {
  createEmailCampaignTransaction,
  updateEmailCampaignTransaction,
  deleteEmailCampaignTransaction,
  updateRecipientCustomContentTransaction,
} from "@/services/email-campaign-services";
import {
  executeCampaignSendingEngine,
  processDueScheduledCampaigns,
} from "@/lib/email-scheduler";

export async function createEmailCampaignAction(
  formData: unknown,
): Promise<ActionResponse & { campaignId?: number }> {
  try {
    const { user } = await assertPermission("create", "/dashboard/email-campaigns");
    const parsed = emailCampaignCreateSchema.safeParse(formData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message;
      });
      return { success: false, errors: fieldErrors };
    }

    const userId = Number(user.id) || 1;

    const campaign = await createEmailCampaignTransaction(
      {
        ...parsed.data,
        scheduled_at: parsed.data.scheduled_at
          ? new Date(parsed.data.scheduled_at)
          : null,
      },
      userId,
    );

    revalidateTag("email-campaigns", "max");

    after(async () => {
      await logActivity({
        action: "create_email_campaign",
        entity_type: "email_campaign",
        entity_id: campaign.id,
        user,
        status: "SUCCESS",
        details: { name: campaign.name },
      });
    });

    return {
      success: true,
      campaignId: campaign.id,
      message: "Campaign created successfully.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to create campaign.",
    };
  }
}

export async function updateEmailCampaignAction(
  id: number,
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const { user } = await assertPermission("update", "/dashboard/email-campaigns");
    const parsed = emailCampaignUpdateSchema.safeParse(formData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message;
      });
      return { success: false, errors: fieldErrors };
    }

    const userId = Number(user.id) || 1;

    await updateEmailCampaignTransaction(
      id,
      {
        ...parsed.data,
        scheduled_at: parsed.data.scheduled_at
          ? new Date(parsed.data.scheduled_at)
          : undefined,
      },
      userId,
    );

    revalidateTag("email-campaigns", "max");

    after(async () => {
      await logActivity({
        action: "update_email_campaign",
        entity_type: "email_campaign",
        entity_id: id,
        user,
        status: "SUCCESS",
        details: parsed.data,
      });
    });

    return {
      success: true,
      message: "Campaign updated successfully.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to update campaign.",
    };
  }
}

export async function deleteEmailCampaignAction(
  id: number,
): Promise<ActionResponse> {
  try {
    const { user } = await assertPermission("delete", "/dashboard/email-campaigns");
    await deleteEmailCampaignTransaction(id);
    revalidateTag("email-campaigns", "max");

    after(async () => {
      await logActivity({
        action: "delete_email_campaign",
        entity_type: "email_campaign",
        entity_id: id,
        user,
        status: "SUCCESS",
      });
    });

    return {
      success: true,
      message: "Campaign deleted successfully.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to delete campaign.",
    };
  }
}

export async function sendCampaignNowAction(
  campaignId: number,
): Promise<ActionResponse> {
  try {
    const { user } = await assertPermission("update", "/dashboard/email-campaigns");

    after(async () => {
      try {
        console.log(`[sendCampaignNowAction] Triggering campaign #${campaignId} via after()`);
        await executeCampaignSendingEngine(campaignId);
        revalidateTag("email-campaigns", "max");
        revalidateTag("sent-emails", "max");

        await logActivity({
          action: "send_email_campaign",
          entity_type: "email_campaign",
          entity_id: campaignId,
          user,
          status: "SUCCESS",
        });
      } catch (err) {
        console.error(`[sendCampaignNowAction] Execution failed for #${campaignId}:`, err);
        await logActivity({
          action: "send_email_campaign",
          entity_type: "email_campaign",
          entity_id: campaignId,
          user,
          status: "FAILED",
          details: { error: String(err) },
        });
      }
    });

    revalidateTag("email-campaigns", "max");

    return {
      success: true,
      message: "Campaign execution started in background.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to trigger campaign execution.",
    };
  }
}

export async function scheduleEmailCampaignAction(
  campaignId: number,
  scheduledAt: string,
): Promise<ActionResponse> {
  try {
    const { user } = await assertPermission("update", "/dashboard/email-campaigns");

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      return {
        success: false,
        message: "Please specify a valid future date and time for scheduling.",
      };
    }

    const userId = Number(user.id) || 1;

    await updateEmailCampaignTransaction(
      campaignId,
      {
        scheduled_at: scheduledDate,
        status: "scheduled",
      },
      userId,
    );

    revalidateTag("email-campaigns", "max");

    after(async () => {
      await logActivity({
        action: "schedule_email_campaign",
        entity_type: "email_campaign",
        entity_id: campaignId,
        user,
        status: "SUCCESS",
        details: { scheduledAt: scheduledDate.toISOString() },
      });
    });

    return {
      success: true,
      message: `Campaign scheduled for ${scheduledDate.toUTCString()}.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to schedule campaign.",
    };
  }
}

export async function resendFailedCampaignRecipientsAction(
  campaignId: number,
): Promise<ActionResponse> {
  try {
    const { user } = await assertPermission("update", "/dashboard/email-campaigns");

    after(async () => {
      try {
        console.log(`[resendFailedCampaignRecipientsAction] Retrying failed recipients for campaign #${campaignId}`);
        await executeCampaignSendingEngine(campaignId, true);
        revalidateTag("email-campaigns", "max");
        revalidateTag("sent-emails", "max");

        await logActivity({
          action: "resend_failed_campaign_recipients",
          entity_type: "email_campaign",
          entity_id: campaignId,
          user,
          status: "SUCCESS",
        });
      } catch (err) {
        console.error(`[resendFailedCampaignRecipientsAction] Execution failed for #${campaignId}:`, err);
        await logActivity({
          action: "resend_failed_campaign_recipients",
          entity_type: "email_campaign",
          entity_id: campaignId,
          user,
          status: "FAILED",
          details: { error: String(err) },
        });
      }
    });

    return {
      success: true,
      message: "Retrying failed recipients in background.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to trigger retry for failed recipients.",
    };
  }
}

export async function updateRecipientCustomContentAction(
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const { user } = await assertPermission("update", "/dashboard/email-campaigns");
    const parsed = recipientCustomContentSchema.safeParse(formData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message;
      });
      return { success: false, errors: fieldErrors };
    }

    await updateRecipientCustomContentTransaction(
      parsed.data.recipient_id,
      parsed.data.custom_subject,
      parsed.data.custom_body_html,
    );

    revalidateTag("email-campaigns", "max");

    after(async () => {
      await logActivity({
        action: "update_recipient_custom_content",
        entity_type: "email_campaign_recipient",
        entity_id: parsed.data.recipient_id,
        user,
        status: "SUCCESS",
      });
    });

    return {
      success: true,
      message: "Custom recipient content updated.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to update custom recipient content.",
    };
  }
}

export async function triggerScheduledCampaignsCronAction(): Promise<ActionResponse> {
  try {
    const { user } = await assertPermission("update", "/dashboard/email-campaigns");
    const results = await processDueScheduledCampaigns();
    revalidateTag("email-campaigns", "max");
    revalidateTag("sent-emails", "max");

    after(async () => {
      await logActivity({
        action: "trigger_scheduled_campaigns_cron",
        entity_type: "email_campaign",
        user,
        status: "SUCCESS",
        details: { count: results.length },
      });
    });

    return {
      success: true,
      message: `Cron executed. Processed ${results.length} due scheduled campaign(s).`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to trigger scheduled campaigns cron.",
    };
  }
}
