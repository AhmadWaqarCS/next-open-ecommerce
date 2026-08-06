"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  InvoiceCreateInput,
  InvoiceUpdateInput,
  invoiceCreateSchema,
  invoiceUpdateSchema,
} from "@/lib/validations";
import {
  createInvoiceTransaction,
  updateInvoiceTransaction,
  deleteInvoiceTransaction,
  restoreInvoiceTransaction,
  permanentlyDeleteInvoiceTransaction,
  bulkDeleteInvoicesTransaction,
  bulkRestoreInvoicesTransaction,
  bulkPermanentlyDeleteInvoicesTransaction,
} from "@/services/invoice-services";
import { sendInvoiceAndOrderEmailsForOrder } from "@/services/email-services";
import { revalidatePath } from "next/cache";

export async function createInvoice(
  data: InvoiceCreateInput,
): Promise<ActionResponse & { invoiceId?: number }> {
  const { user } = await assertPermission("create", "/dashboard/invoices");

  const validatedFields = invoiceCreateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Please fix the validation errors.",
    };
  }

  const {
    order_id,
    status,
    customer_name,
    customer_email,
    subtotal,
    tax_amount,
    shipping_cost,
    discount_amount,
    total,
    currency,
    notes,
    due_at,
    paid_at,
  } = validatedFields.data;

  try {
    const invoice = await createInvoiceTransaction(
      {
        order_id,
        status,
        customer_name,
        customer_email,
        subtotal,
        tax_amount: tax_amount ?? 0,
        shipping_cost: shipping_cost ?? 0,
        discount_amount: discount_amount ?? 0,
        total,
        currency: currency || "USD",
        notes: notes || null,
        due_at: due_at ? new Date(due_at) : null,
        paid_at: paid_at ? new Date(paid_at) : null,
      },
      Number(user.id),
    );

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/orders/${order_id}`);

    await logActivity({
      action: "create_invoice",
      entity_type: "invoice",
      entity_id: invoice.id,
      user,
      status: "SUCCESS",
      details: { invoice_id: invoice.id, order_id, total: String(total) },
    });

    return {
      success: true,
      message: "Invoice created successfully.",
      invoiceId: invoice.id,
    };
  } catch (error: any) {
    console.error("[createInvoice] Error:", error);
    await logActivity({
      action: "create_invoice",
      entity_type: "invoice",
      user,
      status: "FAILED",
      details: { order_id, error: String(error) },
    });
    return {
      success: false,
      message: error?.message || "Failed to create invoice.",
    };
  }
}

export async function updateInvoice(
  id: number,
  data: InvoiceUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/invoices");

  if (id < 1) return { success: false, message: "Invalid invoice ID." };

  const validatedFields = invoiceUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Please fix the validation errors.",
    };
  }

  const {
    status,
    customer_name,
    customer_email,
    subtotal,
    tax_amount,
    shipping_cost,
    discount_amount,
    total,
    currency,
    notes,
    due_at,
    paid_at,
  } = validatedFields.data;

  try {
    await updateInvoiceTransaction(
      id,
      {
        status,
        customer_name,
        customer_email,
        subtotal,
        tax_amount,
        shipping_cost,
        discount_amount,
        total,
        currency,
        notes: notes !== undefined ? notes || null : undefined,
        due_at: due_at !== undefined ? (due_at ? new Date(due_at) : null) : undefined,
        paid_at: paid_at !== undefined ? (paid_at ? new Date(paid_at) : null) : undefined,
      },
      Number(user.id),
    );

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${id}`);

    await logActivity({
      action: "update_invoice",
      entity_type: "invoice",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, status },
    });

    return { success: true, message: "Invoice updated successfully." };
  } catch (error) {
    console.error("[updateInvoice] Error:", error);
    await logActivity({
      action: "update_invoice",
      entity_type: "invoice",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to update invoice." };
  }
}

export async function deleteInvoice(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/invoices");

  if (id < 1) return { success: false, message: "Invalid invoice ID." };

  try {
    await deleteInvoiceTransaction(id, Number(user.id));
    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard/invoices/trash");

    await logActivity({
      action: "delete_invoice",
      entity_type: "invoice",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return { success: true, message: "Invoice moved to trash." };
  } catch (error) {
    console.error("[deleteInvoice] Error:", error);
    await logActivity({
      action: "delete_invoice",
      entity_type: "invoice",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to delete invoice." };
  }
}

export async function restoreInvoice(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/invoices");

  if (id < 1) return { success: false, message: "Invalid invoice ID." };

  try {
    await restoreInvoiceTransaction(id, Number(user.id));
    revalidatePath("/dashboard/invoices/trash");
    revalidatePath("/dashboard/invoices");

    await logActivity({
      action: "restore_invoice",
      entity_type: "invoice",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return { success: true, message: "Invoice restored successfully." };
  } catch (error) {
    console.error("[restoreInvoice] Error:", error);
    await logActivity({
      action: "restore_invoice",
      entity_type: "invoice",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to restore invoice." };
  }
}

export async function permanentlyDeleteInvoice(
  id: number,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/invoices");

  if (id < 1) return { success: false, message: "Invalid invoice ID." };

  try {
    await permanentlyDeleteInvoiceTransaction(id);
    revalidatePath("/dashboard/invoices/trash");

    await logActivity({
      action: "permanently_delete_invoice",
      entity_type: "invoice",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return { success: true, message: "Invoice permanently deleted." };
  } catch (error) {
    console.error("[permanentlyDeleteInvoice] Error:", error);
    await logActivity({
      action: "permanently_delete_invoice",
      entity_type: "invoice",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to permanently delete invoice." };
  }
}

export async function bulkDeleteInvoices(
  ids: number[],
  selectAllScope: boolean = false,
  isTrash: boolean = false,
  filterWhere?: any,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/invoices");

  try {
    await bulkDeleteInvoicesTransaction(
      ids,
      selectAllScope,
      isTrash,
      filterWhere,
      Number(user.id),
    );
    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard/invoices/trash");

    await logActivity({
      action: "bulk_delete_invoices",
      entity_type: "invoice",
      user,
      status: "SUCCESS",
      details: { ids },
    });

    return { success: true, message: "Selected invoices moved to trash." };
  } catch (error) {
    console.error("[bulkDeleteInvoices] Error:", error);
    await logActivity({
      action: "bulk_delete_invoices",
      entity_type: "invoice",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return { success: false, message: "Failed to delete selected invoices." };
  }
}

export async function bulkRestoreInvoices(
  ids: number[],
  selectAllScope: boolean = false,
  isTrash: boolean = true,
  filterWhere?: any,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/invoices");

  try {
    await bulkRestoreInvoicesTransaction(
      ids,
      selectAllScope,
      isTrash,
      filterWhere,
      Number(user.id),
    );
    revalidatePath("/dashboard/invoices/trash");
    revalidatePath("/dashboard/invoices");

    await logActivity({
      action: "bulk_restore_invoices",
      entity_type: "invoice",
      user,
      status: "SUCCESS",
      details: { ids },
    });

    return { success: true, message: "Selected invoices restored." };
  } catch (error) {
    console.error("[bulkRestoreInvoices] Error:", error);
    await logActivity({
      action: "bulk_restore_invoices",
      entity_type: "invoice",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return { success: false, message: "Failed to restore selected invoices." };
  }
}

export async function bulkPermanentlyDeleteInvoices(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: any,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/invoices");

  try {
    await bulkPermanentlyDeleteInvoicesTransaction(ids, selectAllScope, filterWhere);
    revalidatePath("/dashboard/invoices/trash");

    await logActivity({
      action: "bulk_permanently_delete_invoices",
      entity_type: "invoice",
      user,
      status: "SUCCESS",
      details: { ids },
    });

    return { success: true, message: "Selected invoices permanently deleted." };
  } catch (error) {
    console.error("[bulkPermanentlyDeleteInvoices] Error:", error);
    await logActivity({
      action: "bulk_permanently_delete_invoices",
      entity_type: "invoice",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return {
      success: false,
      message: "Failed to permanently delete selected invoices.",
    };
  }
}

export async function generateAndSendInvoiceAction(
  orderId: number,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/invoices");

  if (orderId < 1) return { success: false, message: "Invalid order ID." };

  try {
    const result = await sendInvoiceAndOrderEmailsForOrder(orderId, Number(user.id));
    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${result.invoice.id}`);
    revalidatePath(`/dashboard/orders/${orderId}`);
    revalidatePath("/dashboard/sent-emails");

    await logActivity({
      action: "generate_send_invoice",
      entity_type: "invoice",
      entity_id: result.invoice.id,
      user,
      status: "SUCCESS",
      details: { orderId, invoiceId: result.invoice.id },
    });

    if (result.customerResult.success) {
      return { success: true, message: "Invoice generated and sent to customer." };
    } else {
      return {
        success: true,
        message: `Invoice generated, but email dispatch reported an issue: ${result.customerResult.error || "Check Sent Email logs."}`,
      };
    }
  } catch (error: any) {
    console.error("[generateAndSendInvoiceAction] Error:", error);
    await logActivity({
      action: "generate_send_invoice",
      entity_type: "invoice",
      user,
      status: "FAILED",
      details: { orderId, error: String(error) },
    });
    return {
      success: false,
      message: error?.message || "Failed to generate and send invoice.",
    };
  }
}
