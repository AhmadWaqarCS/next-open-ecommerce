"use server";

import { ActionResponse, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import { sendEmailWithNodemailer, getSentEmailByIdFromDB } from "@/services/email-services";
import { revalidatePath } from "next/cache";

export async function resendEmailAction(sentEmailId: number): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/sent-emails");

  if (sentEmailId < 1) return { success: false, message: "Invalid email ID." };

  const existingLog = await getSentEmailByIdFromDB(sentEmailId);

  if (!existingLog) {
    return { success: false, message: "Email record not found." };
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
    revalidatePath(`/dashboard/sent-emails/${sentEmailId}`);

    await logActivity({
      action: "resend_email",
      entity_type: "sent_email",
      entity_id: sentEmailId,
      user,
      status: result.success ? "SUCCESS" : "FAILED",
      details: { sentEmailId, recipient: existingLog.recipient_email },
    });

    if (result.success) {
      return { success: true, message: "Email resent successfully." };
    } else {
      return {
        success: false,
        message: `Failed to resend email: ${result.error || "Unknown error"}`,
      };
    }
  } catch (error: any) {
    console.error("[resendEmailAction] Error:", error);
    await logActivity({
      action: "resend_email",
      entity_type: "sent_email",
      entity_id: sentEmailId,
      user,
      status: "FAILED",
      details: { sentEmailId, error: String(error) },
    });
    return {
      success: false,
      message: error?.message || "Failed to resend email.",
    };
  }
}
