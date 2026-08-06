"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ActionResponse, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";
import {
  createEmailTemplateInDB,
  updateEmailTemplateInDB,
  deleteEmailTemplatePermanentlyInDB,
} from "@/services/email-template-services";
import { sendEmailWithNodemailer } from "@/services/email-services";
import { renderEmailTemplate, EMAIL_USE_CASES } from "@/lib/email-template-engine";

const templateSchema = z.object({
  key: z.string().min(1, "Use case key is required."),
  name: z.string().min(2, "Template name must be at least 2 characters."),
  description: z.string().optional().nullable(),
  subject: z.string().min(1, "Subject template is required."),
  body_html: z.string().min(10, "Body HTML must be at least 10 characters."),
  is_active: z.boolean().optional(),
});

export async function createEmailTemplateAction(
  formData: z.infer<typeof templateSchema>
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/email-templates");

  const parsed = templateSchema.safeParse(formData);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      if (issue.path[0]) errors[issue.path[0].toString()] = issue.message;
    });
    return { success: false, errors, message: "Validation error." };
  }

  try {
    const useCaseDef = EMAIL_USE_CASES.find((u) => u.key === parsed.data.key);

    const record = await createEmailTemplateInDB({
      key: parsed.data.key,
      name: parsed.data.name,
      description: parsed.data.description || useCaseDef?.description || null,
      subject: parsed.data.subject,
      body_html: parsed.data.body_html,
      available_variables: useCaseDef?.availableVariables || null,
      is_active: parsed.data.is_active || false,
      created_by: Number(user.id) || 1,
    });

    revalidatePath("/dashboard/email-templates");

    await logActivity({
      action: "create_email_template",
      entity_type: "email_template",
      entity_id: record.id,
      user,
      status: "SUCCESS",
      details: { key: record.key, name: record.name },
    });

    return { success: true, message: "Email template created successfully." };
  } catch (error: any) {
    console.error("[createEmailTemplateAction] Error:", error);
    return { success: false, message: error?.message || "Failed to create email template." };
  }
}

export async function updateEmailTemplateAction(
  id: number,
  formData: z.infer<typeof templateSchema>
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/email-templates");

  if (!id || id < 1) return { success: false, message: "Invalid template ID." };

  const parsed = templateSchema.safeParse(formData);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      if (issue.path[0]) errors[issue.path[0].toString()] = issue.message;
    });
    return { success: false, errors, message: "Validation error." };
  }

  try {
    const record = await updateEmailTemplateInDB(id, {
      name: parsed.data.name,
      description: parsed.data.description,
      subject: parsed.data.subject,
      body_html: parsed.data.body_html,
      is_active: parsed.data.is_active,
      updated_by: Number(user.id) || 1,
    });

    revalidatePath("/dashboard/email-templates");
    revalidatePath(`/dashboard/email-templates/${id}/edit`);

    await logActivity({
      action: "update_email_template",
      entity_type: "email_template",
      entity_id: record.id,
      user,
      status: "SUCCESS",
      details: { key: record.key, name: record.name, is_active: record.is_active },
    });

    return { success: true, message: "Email template updated successfully." };
  } catch (error: any) {
    console.error("[updateEmailTemplateAction] Error:", error);
    return { success: false, message: error?.message || "Failed to update email template." };
  }
}

export async function activateEmailTemplateAction(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/email-templates");

  if (!id || id < 1) return { success: false, message: "Invalid template ID." };

  try {
    const record = await updateEmailTemplateInDB(id, {
      is_active: true,
      updated_by: Number(user.id) || 1,
    });

    revalidatePath("/dashboard/email-templates");

    await logActivity({
      action: "activate_email_template",
      entity_type: "email_template",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { key: record.key, name: record.name },
    });

    return { success: true, message: `"${record.name}" is now the active template for ${record.key}.` };
  } catch (error: any) {
    console.error("[activateEmailTemplateAction] Error:", error);
    return { success: false, message: error?.message || "Failed to activate email template." };
  }
}

export async function softDeleteEmailTemplateAction(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/email-templates");

  if (!id || id < 1) return { success: false, message: "Invalid template ID." };

  try {
    const record = await updateEmailTemplateInDB(id, {
      deleted_at: new Date(),
      deleted_by: Number(user.id) || 1,
    });

    revalidatePath("/dashboard/email-templates");

    await logActivity({
      action: "soft_delete_email_template",
      entity_type: "email_template",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { key: record.key, name: record.name },
    });

    return { success: true, message: "Email template moved to trash." };
  } catch (error: any) {
    console.error("[softDeleteEmailTemplateAction] Error:", error);
    return { success: false, message: error?.message || "Failed to delete email template." };
  }
}

export async function restoreEmailTemplateAction(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/email-templates");

  if (!id || id < 1) return { success: false, message: "Invalid template ID." };

  try {
    const record = await updateEmailTemplateInDB(id, {
      deleted_at: null,
      deleted_by: null,
      updated_by: Number(user.id) || 1,
    });

    revalidatePath("/dashboard/email-templates");

    await logActivity({
      action: "restore_email_template",
      entity_type: "email_template",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { key: record.key, name: record.name },
    });

    return { success: true, message: "Email template restored successfully." };
  } catch (error: any) {
    console.error("[restoreEmailTemplateAction] Error:", error);
    return { success: false, message: error?.message || "Failed to restore email template." };
  }
}

export async function permanentlyDeleteEmailTemplateAction(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/email-templates");

  if (!id || id < 1) return { success: false, message: "Invalid template ID." };

  try {
    await deleteEmailTemplatePermanentlyInDB(id);

    revalidatePath("/dashboard/email-templates");

    await logActivity({
      action: "permanently_delete_email_template",
      entity_type: "email_template",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return { success: true, message: "Email template deleted permanently." };
  } catch (error: any) {
    console.error("[permanentlyDeleteEmailTemplateAction] Error:", error);
    return { success: false, message: error?.message || "Failed to permanently delete template." };
  }
}

export async function sendTestEmailAction(
  id: number,
  recipientEmail: string
): Promise<ActionResponse> {
  const { user } = await assertPermission("read", "/dashboard/email-templates");

  if (!recipientEmail || !recipientEmail.includes("@")) {
    return { success: false, message: "Please provide a valid recipient email address." };
  }

  try {
    const template = await prisma.email_template.findUnique({
      where: { id },
    });

    if (!template) {
      return { success: false, message: "Template not found." };
    }

    const siteConfig = await prisma.site_config.findFirst({ where: { deleted_at: null } });
    const storeName = siteConfig?.name || "Next Open E-Commerce";

    // Dummy sample variables for preview test send
    const testVariables: Record<string, any> = {
      store_name: storeName,
      store_email: siteConfig?.email || "support@example.com",
      store_phone: siteConfig?.phone || "+1 (555) 000-0000",
      store_address: siteConfig?.address || "123 Commerce St, Suite 100",
      logo_url: siteConfig?.light_logo_url || "",
      storefront_url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      invoice_number: "INV-TEST-1001",
      order_number: "ORD-TEST-9999",
      customer_name: "Jane Smith",
      customer_email: recipientEmail,
      issued_date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      payment_method: "Cash on Delivery",
      status_badge_text: "ISSUED / PENDING PAYMENT",
      status_badge_color: "#ca8a04",
      items_table: `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e4e4e7;"><strong>Sample Product A</strong><br/><span style="font-size:12px;color:#71717a;">Color: Black</span></td>
          <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; text-align: center;">1</td>
          <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; text-align: right;">$49.99</td>
          <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; text-align: right;">$49.99</td>
        </tr>
      `,
      subtotal: "$49.99",
      discount_row: "",
      tax_row: "",
      shipping_cost: "Free",
      total: "$49.99",
      currency_symbol: "$",
      notes_section: "",
      otp_code: "849201",
      expires_minutes: 10,
      order_details_url: `${(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "")}/order/ORD-TEST-9999`,
      to_email: recipientEmail,
      confirmation_url: `${(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "")}/verify-newsletter?token=sample-test-token`,
      year: new Date().getFullYear(),
    };

    const rendered = renderEmailTemplate(template.body_html, template.subject, testVariables);

    const result = await sendEmailWithNodemailer({
      type: `${template.key}_test`,
      toEmail: recipientEmail,
      toName: "Test Recipient",
      subject: `[TEST PREVIEW] ${rendered.subject}`,
      bodyHtml: rendered.bodyHtml,
      createdBy: Number(user.id) || 1,
    });

    await logActivity({
      action: "send_test_email",
      entity_type: "email_template",
      entity_id: id,
      user,
      status: result.success ? "SUCCESS" : "FAILED",
      details: { recipientEmail, key: template.key },
    });

    if (result.success) {
      return { success: true, message: `Test email sent successfully to ${recipientEmail}!` };
    } else {
      return { success: false, message: `Failed to send test email: ${result.error || "Check SMTP configuration."}` };
    }
  } catch (error: any) {
    console.error("[sendTestEmailAction] Error:", error);
    return { success: false, message: error?.message || "Failed to send test email." };
  }
}
