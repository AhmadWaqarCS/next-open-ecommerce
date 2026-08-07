"use server";

import { assertPermission } from "@/lib/guards";
import { revalidateTag } from "next/cache";
import { ActionResponse, logActivity } from "@/lib/action-utils";
import { after } from "next/server";
import {
  customerContactUpdateSchema,
  addToGroupSchema,
} from "@/lib/validations";
import {
  updateCustomerContactInDB,
} from "@/services/customer-contact-services";
import { addCustomerContactsToGroupTransaction } from "@/services/email-group-services";
import {
  createEmailCampaignTransaction,
  addRecipientsToCampaignTransaction,
} from "@/services/email-campaign-services";

export async function updateCustomerContactAction(
  id: number,
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const { user } = await assertPermission("update", "/dashboard/customers");
    const parsed = customerContactUpdateSchema.safeParse(formData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      return { success: false, errors: fieldErrors };
    }

    await updateCustomerContactInDB(id, parsed.data);
    revalidateTag("customer-contacts", "max");

    after(async () => {
      await logActivity({
        action: "update_customer_contact",
        entity_type: "customer_contact",
        entity_id: id,
        user,
        status: "SUCCESS",
        details: parsed.data,
      });
    });

    return {
      success: true,
      message: "Customer contact updated successfully.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to update customer contact.",
    };
  }
}

export async function unsubscribeCustomerContactAction(
  id: number,
): Promise<ActionResponse> {
  try {
    const { user } = await assertPermission("update", "/dashboard/customers");
    await updateCustomerContactInDB(id, { is_unsubscribed: true });
    revalidateTag("customer-contacts", "max");

    after(async () => {
      await logActivity({
        action: "unsubscribe_customer_contact",
        entity_type: "customer_contact",
        entity_id: id,
        user,
        status: "SUCCESS",
      });
    });

    return {
      success: true,
      message: "Customer contact marked as unsubscribed.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to unsubscribe contact.",
    };
  }
}

export async function resubscribeCustomerContactAction(
  id: number,
): Promise<ActionResponse> {
  try {
    const { user } = await assertPermission("update", "/dashboard/customers");
    await updateCustomerContactInDB(id, { is_unsubscribed: false });
    revalidateTag("customer-contacts", "max");

    after(async () => {
      await logActivity({
        action: "resubscribe_customer_contact",
        entity_type: "customer_contact",
        entity_id: id,
        user,
        status: "SUCCESS",
      });
    });

    return {
      success: true,
      message: "Customer contact resubscribed successfully.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to resubscribe contact.",
    };
  }
}

export async function bulkAddCustomersToGroupAction(
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const { user } = await assertPermission("update", "/dashboard/customers");
    const parsed = addToGroupSchema.safeParse(formData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message;
      });
      return { success: false, errors: fieldErrors };
    }

    const { group_id, new_group_name, contact_ids } = parsed.data;
    const userId = Number(user.id) || 1;

    let targetGroupId = group_id;

    if (!targetGroupId && new_group_name) {
      const prisma = (await import("@/lib/prisma")).default;
      const newGroup = await prisma.email_group.create({
        data: {
          name: new_group_name,
          created_by: userId,
          updated_by: userId,
        },
      });
      targetGroupId = newGroup.id;
    }

    if (!targetGroupId) {
      return {
        success: false,
        message: "Please select an existing group or provide a name for a new group.",
      };
    }

    await addCustomerContactsToGroupTransaction(targetGroupId, contact_ids);
    revalidateTag("email-groups", "max");
    revalidateTag("customer-contacts", "max");

    after(async () => {
      await logActivity({
        action: "bulk_add_customers_to_group",
        entity_type: "customer_contact",
        user,
        status: "SUCCESS",
        details: { group_id: targetGroupId, count: contact_ids.length },
      });
    });

    return {
      success: true,
      message: `Successfully added ${contact_ids.length} contacts to email group.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to add contacts to group.",
    };
  }
}

export async function bulkAddCustomersToCampaignAction(data: {
  campaign_id?: number;
  new_campaign_name?: string;
  contact_ids: number[];
}): Promise<ActionResponse & { campaignId?: number }> {
  try {
    const { user } = await assertPermission("create", "/dashboard/email-campaigns");
    const userId = Number(user.id) || 1;

    let targetCampaignId = data.campaign_id;

    if (!targetCampaignId && data.new_campaign_name) {
      const campaign = await createEmailCampaignTransaction(
        {
          name: data.new_campaign_name,
          contact_ids: data.contact_ids,
        },
        userId,
      );
      targetCampaignId = campaign.id;
    } else if (targetCampaignId) {
      await addRecipientsToCampaignTransaction(targetCampaignId, data.contact_ids);
    } else {
      return {
        success: false,
        message: "Please select a draft campaign or specify a new campaign name.",
      };
    }

    revalidateTag("email-campaigns", "max");

    after(async () => {
      await logActivity({
        action: "bulk_add_customers_to_campaign",
        entity_type: "customer_contact",
        user,
        status: "SUCCESS",
        details: { campaign_id: targetCampaignId, count: data.contact_ids.length },
      });
    });

    return {
      success: true,
      campaignId: targetCampaignId,
      message: `Successfully added ${data.contact_ids.length} contacts to campaign.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to add contacts to campaign.",
    };
  }
}
