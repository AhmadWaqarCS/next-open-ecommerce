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

export async function subscribeNewsletter(
  data: EmailInput,
): Promise<{ success: boolean; message: string }> {
  const parsed = EmailSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid email.",
    };
  }

  try {
    await subscribeNewsletterTransaction(parsed.data.email);
    await logActivity({
      action: "subscribe_newsletter",
      entity_type: "newsletter",
      user: { email: parsed.data.email },
      status: "SUCCESS",
      details: { email: parsed.data.email },
    });
    return { success: true, message: "You're subscribed! Thank you." };
  } catch (error) {
    await logActivity({
      action: "subscribe_newsletter",
      entity_type: "newsletter",
      user: { email: parsed.data.email },
      status: "FAILED",
      details: { email: parsed.data.email, error: String(error) },
    });
    return {
      success: false,
      message: "Something went wrong. Please try again.",
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
