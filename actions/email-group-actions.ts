"use server";

import { assertPermission } from "@/lib/guards";
import { revalidateTag } from "next/cache";
import { ActionResponse, logActivity } from "@/lib/action-utils";
import { after } from "next/server";
import { emailGroupCreateSchema } from "@/lib/validations";
import {
  createEmailGroupTransaction,
  updateEmailGroupTransaction,
  deleteEmailGroupTransaction,
  removeCustomerContactFromGroupTransaction,
} from "@/services/email-group-services";

export async function createEmailGroupAction(
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const { user } = await assertPermission("create", "/dashboard/email-groups");
    const parsed = emailGroupCreateSchema.safeParse(formData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message;
      });
      return { success: false, errors: fieldErrors };
    }

    const userId = Number(user.id) || 1;

    const group = await createEmailGroupTransaction(parsed.data, userId);
    revalidateTag("email-groups", "max");

    after(async () => {
      await logActivity({
        action: "create_email_group",
        entity_type: "email_group",
        entity_id: group.id,
        user,
        status: "SUCCESS",
        details: parsed.data,
      });
    });

    return {
      success: true,
      message: "Email group created successfully.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to create email group.",
    };
  }
}

export async function updateEmailGroupAction(
  id: number,
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const { user } = await assertPermission("update", "/dashboard/email-groups");
    const parsed = emailGroupCreateSchema.safeParse(formData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message;
      });
      return { success: false, errors: fieldErrors };
    }

    const userId = Number(user.id) || 1;

    await updateEmailGroupTransaction(id, parsed.data, userId);
    revalidateTag("email-groups", "max");

    after(async () => {
      await logActivity({
        action: "update_email_group",
        entity_type: "email_group",
        entity_id: id,
        user,
        status: "SUCCESS",
        details: parsed.data,
      });
    });

    return {
      success: true,
      message: "Email group updated successfully.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to update email group.",
    };
  }
}

export async function deleteEmailGroupAction(id: number): Promise<ActionResponse> {
  try {
    const { user } = await assertPermission("delete", "/dashboard/email-groups");
    await deleteEmailGroupTransaction(id);
    revalidateTag("email-groups", "max");

    after(async () => {
      await logActivity({
        action: "delete_email_group",
        entity_type: "email_group",
        entity_id: id,
        user,
        status: "SUCCESS",
      });
    });

    return {
      success: true,
      message: "Email group deleted successfully.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to delete email group.",
    };
  }
}

export async function removeMemberFromGroupAction(
  groupId: number,
  contactId: number,
): Promise<ActionResponse> {
  try {
    const { user } = await assertPermission("update", "/dashboard/email-groups");
    await removeCustomerContactFromGroupTransaction(groupId, contactId);
    revalidateTag("email-groups", "max");

    after(async () => {
      await logActivity({
        action: "remove_member_from_group",
        entity_type: "email_group",
        entity_id: groupId,
        user,
        status: "SUCCESS",
        details: { contactId },
      });
    });

    return {
      success: true,
      message: "Contact removed from group.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to remove member from group.",
    };
  }
}
