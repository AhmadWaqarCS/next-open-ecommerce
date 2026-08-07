"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  EmailConfigCreateInput,
  EmailConfigUpdateInput,
  emailConfigCreateSchema,
  emailConfigUpdateSchema,
} from "@/lib/validations";
import {
  createEmailConfigTransaction,
  updateEmailConfigTransaction,
} from "@/services/email-config-services";
import { revalidatePath } from "next/cache";

// ─── EMAIL CONFIG ─────────────────────────────────────────────────────────────

export async function createEmailConfig(
  data: EmailConfigCreateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/email-config");

  const validatedFields = emailConfigCreateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const {
    provider,
    from_name,
    from_email,
    reply_to_email,
    send_order_confirmation,
    send_shipping_update,
    send_admin_new_order,
    admin_notification_email,
    include_pdf_invoice,
    is_active,
  } = validatedFields.data;

  try {
    await createEmailConfigTransaction(
      {
        provider,
        from_name,
        from_email,
        reply_to_email: reply_to_email || null,
        send_order_confirmation,
        send_shipping_update,
        send_admin_new_order,
        admin_notification_email: admin_notification_email || null,
        include_pdf_invoice,
        is_active,
      },
      Number(user.id),
    );

    revalidatePath("/dashboard/email-config");

    await logActivity({
      action: "create_email_config",
      entity_type: "email_config",
      user,
      status: "SUCCESS",
      details: { provider, from_email },
    });

    return { success: true, message: "Email config created successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "create_email_config",
      entity_type: "email_config",
      user,
      status: "FAILED",
      details: { error: String(error) },
    });
    return { success: false, message: "Failed to create email config." };
  }
}

export async function updateEmailConfig(
  id: number,
  data: EmailConfigUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/email-config");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const validatedFields = emailConfigUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const {
    provider,
    from_name,
    from_email,
    reply_to_email,
    send_order_confirmation,
    send_shipping_update,
    send_admin_new_order,
    admin_notification_email,
    include_pdf_invoice,
    is_active,
  } = validatedFields.data;

  try {
    await updateEmailConfigTransaction(
      id,
      {
        provider,
        from_name,
        from_email,
        reply_to_email:
          reply_to_email !== undefined ? reply_to_email || null : undefined,
        send_order_confirmation,
        send_shipping_update,
        send_admin_new_order,
        admin_notification_email:
          admin_notification_email !== undefined
            ? admin_notification_email || null
            : undefined,
        include_pdf_invoice,
        is_active,
      },
      Number(user.id),
    );

    revalidatePath("/dashboard/email-config");

    await logActivity({
      action: "update_email_config",
      entity_type: "email_config",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, provider, from_email },
    });

    return { success: true, message: "Email config updated successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "update_email_config",
      entity_type: "email_config",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to update email config." };
  }
}

export async function verifyAndActivateEmailConfigAction(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/email-config");

  try {
    const { verifyAndActivateEmailConfigTransaction } = await import("@/services/email-config-services");
    const result = await verifyAndActivateEmailConfigTransaction(id, Number(user.id));

    revalidatePath("/dashboard/email-config");

    await logActivity({
      action: "verify_email_config",
      entity_type: "email_config",
      entity_id: id,
      user,
      status: result.success ? "SUCCESS" : "FAILED",
      details: { id, message: result.message },
    });

    return {
      success: result.success,
      message: result.message,
    };
  } catch (error: any) {
    console.error("[verifyAndActivateEmailConfigAction] Error:", error);
    await logActivity({
      action: "verify_email_config",
      entity_type: "email_config",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return {
      success: false,
      message: error?.message || "Failed to verify SMTP server configuration.",
    };
  }
}

export async function verifyEmailConfigAction(id: number = 1): Promise<ActionResponse> {
  return await verifyAndActivateEmailConfigAction(id);
}
