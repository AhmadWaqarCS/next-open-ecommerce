"use server";

import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  EmailConfigCreateInput,
  EmailConfigUpdateInput,
  emailConfigCreateSchema,
  emailConfigUpdateSchema,
} from "@/lib/validations";
import {
  createEmailConfigInDB,
  updateEmailConfigInDB,
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
    await createEmailConfigInDB({
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
      created_by: Number(user.id),
      updated_by: Number(user.id),
    });

    revalidatePath("/dashboard/email-config");
    return { success: true, message: "Email config created successfully." };
  } catch (error) {
    console.log(error);
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
    await updateEmailConfigInDB(id, {
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
      updated_by: Number(user.id),
    });

    revalidatePath("/dashboard/email-config");
    return { success: true, message: "Email config updated successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to update email config." };
  }
}

export async function deleteEmailConfig(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/email-config");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await updateEmailConfigInDB(id, {
      updated_by: Number(user.id),
      deleted_at: new Date(),
      deleted_by: Number(user.id),
    });
    revalidatePath("/dashboard/email-config");
    return { success: true, message: "Email config deleted successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to delete email config." };
  }
}

export async function restoreEmailConfig(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/email-config");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await updateEmailConfigInDB(id, {
      updated_by: Number(user.id),
      deleted_at: null,
      deleted_by: null,
    });
    revalidatePath("/dashboard/email-config");
    return { success: true, message: "Email config restored successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to restore email config." };
  }
}

// ─── VERIFY EMAIL CONFIG ACTION ────────────────────────────────────────────────

export async function verifyEmailConfigAction(): Promise<ActionResponse> {
  await assertPermission("update", "/dashboard/email-config");

  try {
    const { verifySmtpConnectionService } =
      await import("@/services/email-services");
    const result = await verifySmtpConnectionService();
    return {
      success: result.success,
      message: result.message,
    };
  } catch (error: any) {
    console.error("[verifyEmailConfigAction] Error:", error);
    return {
      success: false,
      message: error?.message || "Failed to verify SMTP server configuration.",
    };
  }
}
