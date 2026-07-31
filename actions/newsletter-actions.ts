"use server";

import { ActionResponse } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import { EmailInput, EmailSchema } from "@/lib/validations";
import {
  upsertNewsletterSubscriberInDB,
  deleteNewsletterSubscriberInDB,
  bulkDeleteNewsletterSubscribersInDB,
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
    await upsertNewsletterSubscriberInDB(parsed.data.email);
    return { success: true, message: "You're subscribed! Thank you." };
  } catch {
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }
}

export async function deleteNewsletterSubscriber(
  id: number
): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/newsletter");

  if (id < 1) {
    return { success: false, message: "Invalid subscriber ID." };
  }

  try {
    await deleteNewsletterSubscriberInDB(id);
    revalidatePath("/dashboard/newsletter");
    return { success: true, message: "Newsletter subscriber deleted successfully." };
  } catch (error) {
    console.error("Error deleting newsletter subscriber:", error);
    return { success: false, message: "Failed to delete newsletter subscriber." };
  }
}

export async function bulkDeleteNewsletterSubscribers(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: NewsletterFilterParams
): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/newsletter");

  const filterWhere =
    selectAllScope && filterParams
      ? await getNewsletterFilterWhere(filterParams)
      : undefined;

  try {
    await bulkDeleteNewsletterSubscribersInDB(ids, selectAllScope, filterWhere);
    revalidatePath("/dashboard/newsletter");
    return {
      success: true,
      message: "Selected newsletter subscribers deleted successfully.",
    };
  } catch (error) {
    console.error("Error bulk deleting newsletter subscribers:", error);
    return {
      success: false,
      message: "Failed to delete selected newsletter subscribers.",
    };
  }
}
