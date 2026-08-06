"use server";

import { ActionResponse, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import { EmailInput, EmailSchema } from "@/lib/validations";
import {
  subscribeNewsletterTransaction,
  deleteNewsletterSubscriberTransaction,
  bulkDeleteNewsletterSubscribersTransaction,
} from "@/services/newsletter-services";
import {
  NewsletterFilterParams,
  getNewsletterFilterWhere,
} from "@/lib/filters/newsletter-filters";
import { revalidatePath } from "next/cache";
import { verifyCaptchaToken } from "@/lib/captcha";
import { headers } from "next/headers";
import { encryptNewsletterToken, decryptNewsletterToken } from "@/lib/newsletter-token";
import { sendNewsletterConfirmationEmail } from "@/services/email-services";

export async function subscribeNewsletter(
  data: EmailInput,
): Promise<{ success: boolean; message: string }> {
  const parsed = EmailSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid email address.",
    };
  }

  const captchaRes = await verifyCaptchaToken(parsed.data.captcha_token);
  if (!captchaRes.success) {
    return {
      success: false,
      message: captchaRes.error || "Security verification failed. Please try again.",
    };
  }

  try {
    const token = encryptNewsletterToken(parsed.data.email);

    const headerList = await headers();
    const host = headerList.get("host") || "localhost:3000";
    const protocol = headerList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
      ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
      : `${protocol}://${host}`;

    const confirmationUrl = `${baseUrl}/newsletter/confirm?token=${encodeURIComponent(token)}`;

    const emailResult = await sendNewsletterConfirmationEmail({
      toEmail: parsed.data.email,
      confirmationUrl,
    });

    if (!emailResult.success) {
      return {
        success: false,
        message: emailResult.error || "Failed to send confirmation email. Please try again later.",
      };
    }

    return {
      success: true,
      message: "A confirmation link has been sent to your email. Please check your inbox!",
    };
  } catch (error) {
    console.error("Error dispatching newsletter confirmation:", error);
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }
}

export async function confirmNewsletterSubscription(
  token: string,
): Promise<{ success: boolean; message: string; email?: string }> {
  const result = decryptNewsletterToken(token);

  if (!result.success) {
    return {
      success: false,
      message: result.error,
    };
  }

  try {
    await subscribeNewsletterTransaction(result.email);
    await logActivity({
      action: "subscribe_newsletter",
      entity_type: "newsletter",
      user: { email: result.email },
      status: "SUCCESS",
      details: { email: result.email },
    });
    return {
      success: true,
      email: result.email,
      message: "Your subscription has been confirmed! Thank you.",
    };
  } catch (error) {
    console.error("Error confirming newsletter subscription:", error);
    await logActivity({
      action: "subscribe_newsletter",
      entity_type: "newsletter",
      user: { email: result.email },
      status: "FAILED",
      details: { email: result.email, error: String(error) },
    });
    return {
      success: false,
      message: "Failed to confirm subscription. Please try again.",
    };
  }
}


export async function deleteNewsletterSubscriber(
  id: number,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/newsletter");

  if (id < 1) {
    return { success: false, message: "Invalid subscriber ID." };
  }

  try {
    await deleteNewsletterSubscriberTransaction(id);
    revalidatePath("/dashboard/newsletter");

    await logActivity({
      action: "delete_newsletter_subscriber",
      entity_type: "newsletter",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return { success: true, message: "Newsletter subscriber deleted successfully." };
  } catch (error) {
    console.error("Error deleting newsletter subscriber:", error);
    await logActivity({
      action: "delete_newsletter_subscriber",
      entity_type: "newsletter",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to delete newsletter subscriber." };
  }
}

export async function bulkDeleteNewsletterSubscribers(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: NewsletterFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/newsletter");

  const filterWhere =
    selectAllScope && filterParams
      ? await getNewsletterFilterWhere(filterParams)
      : undefined;

  try {
    await bulkDeleteNewsletterSubscribersTransaction(ids, selectAllScope, filterWhere);
    revalidatePath("/dashboard/newsletter");

    await logActivity({
      action: "bulk_delete_newsletter_subscribers",
      entity_type: "newsletter",
      user,
      status: "SUCCESS",
      details: { ids },
    });

    return {
      success: true,
      message: "Selected newsletter subscribers deleted successfully.",
    };
  } catch (error) {
    console.error("Error bulk deleting newsletter subscribers:", error);
    await logActivity({
      action: "bulk_delete_newsletter_subscribers",
      entity_type: "newsletter",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return {
      success: false,
      message: "Failed to delete selected newsletter subscribers.",
    };
  }
}
