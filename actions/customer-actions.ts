"use server";

import { assertPermission } from "@/lib/guards";
import { revalidateTag, revalidatePath } from "next/cache";
import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { after } from "next/server";
import {
  customerContactUpdateSchema,
  addToGroupSchema,
  bulkAddToCampaignSchema,
} from "@/lib/validations";
import {
  updateCustomerContactInDB,
} from "@/services/customer-services";
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
      return { success: false, errors: formatZodErrors(parsed.error) };
    }

    await updateCustomerContactInDB(id, parsed.data);
    revalidateTag("customer-contacts", "max");
    revalidatePath("/dashboard/customers");
    revalidatePath(`/dashboard/customers/${id}`);

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
    revalidatePath("/dashboard/customers");
    revalidatePath(`/dashboard/customers/${id}`);

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
    revalidatePath("/dashboard/customers");
    revalidatePath(`/dashboard/customers/${id}`);

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
      return { success: false, errors: formatZodErrors(parsed.error) };
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
    revalidatePath("/dashboard/customers");

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

export async function bulkAddCustomersToCampaignAction(
  formData: unknown,
): Promise<ActionResponse & { campaignId?: number }> {
  try {
    const { user } = await assertPermission("create", "/dashboard/email-campaigns");
    const parsed = bulkAddToCampaignSchema.safeParse(formData);

    if (!parsed.success) {
      return { success: false, errors: formatZodErrors(parsed.error) };
    }

    const userId = Number(user.id) || 1;
    const { campaign_id, new_campaign_name, contact_ids } = parsed.data;

    let targetCampaignId = campaign_id;

    if (!targetCampaignId && new_campaign_name) {
      const campaign = await createEmailCampaignTransaction(
        {
          name: new_campaign_name,
          contact_ids,
        },
        userId,
      );
      targetCampaignId = campaign.id;
    } else if (targetCampaignId) {
      await addRecipientsToCampaignTransaction(targetCampaignId, contact_ids);
    } else {
      return {
        success: false,
        message: "Please select a draft campaign or specify a new campaign name.",
      };
    }

    revalidateTag("email-campaigns", "max");
    revalidatePath("/dashboard/customers");

    after(async () => {
      await logActivity({
        action: "bulk_add_customers_to_campaign",
        entity_type: "customer_contact",
        user,
        status: "SUCCESS",
        details: { campaign_id: targetCampaignId, count: contact_ids.length },
      });
    });

    return {
      success: true,
      campaignId: targetCampaignId,
      message: `Successfully added ${contact_ids.length} contacts to campaign.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to add contacts to campaign.",
    };
  }
}
