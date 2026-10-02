"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import { resendEmailSchema } from "@/lib/validations";
import { getSentEmailByIdFromDB } from "@/services/sent-email-services";
import { sendEmailWithNodemailer } from "@/services/email-services";

/**
 * Server action to resend a previously dispatched email.
 * Validates the ID with Zod, re-dispatches through nodemailer, logs activity,
 * and creates a new sent_email audit entry upon success.
 */
export async function resendEmailAction(sentEmailId: number): Promise<ActionResponse> {
  const { user } = await assertPermission("read", "/dashboard/sent-emails");

  const parsed = resendEmailSchema.safeParse({ id: sentEmailId });
  if (!parsed.success) {
    return {
      success: false,
      errors: formatZodErrors(parsed.error),
      message: "Invalid email ID provided.",
    };
  }

  const existingLog = await getSentEmailByIdFromDB(parsed.data.id);
  if (!existingLog) {
    return {
      success: false,
      message: "Email log record not found.",
    };
  }

  try {
    const result = await sendEmailWithNodemailer({
      type: existingLog.type,
      toEmail: existingLog.recipient_email,
      toName: existingLog.recipient_name || undefined,
      subject: existingLog.subject,
      bodyHtml: existingLog.body_html,
      orderNumber: existingLog.order_number || undefined,
      orderId: existingLog.order_id || undefined,
      invoiceId: existingLog.invoice_id || undefined,
    });

    revalidatePath("/dashboard/sent-emails");
    revalidatePath(`/dashboard/sent-emails/${parsed.data.id}`);
    revalidateTag("sent-emails", "max");

    await logActivity({
      action: "resend_email",
      entity_type: "sent_email",
      entity_id: parsed.data.id,
      user,
      status: result.success ? "SUCCESS" : "FAILED",
      details: {
        sentEmailId: parsed.data.id,
        recipient: existingLog.recipient_email,
        subject: existingLog.subject,
        newSentEmailId: result.sentEmailId,
      },
    });

    if (result.success) {
      return {
        success: true,
        message: `Email successfully resent to ${existingLog.recipient_email}.`,
        data: { sentEmailId: result.sentEmailId },
      };
    } else {
      return {
        success: false,
        message: `Failed to resend email: ${result.error || "Delivery error"}`,
      };
    }
  } catch (error: any) {
    console.error("[resendEmailAction] Error:", error);
    await logActivity({
      action: "resend_email",
      entity_type: "sent_email",
      entity_id: parsed.data.id,
      user,
      status: "FAILED",
      details: { sentEmailId: parsed.data.id, error: String(error) },
    });
    return {
      success: false,
      message: error?.message || "An unexpected error occurred while resending the email.",
    };
  }
}
