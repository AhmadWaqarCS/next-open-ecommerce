"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  getPaymentMethodByIdInDB,
  togglePaymentMethodStatusTransaction,
  updatePaymentMethodTransaction,
} from "@/services/payment-method-services";
import { revalidatePath, revalidateTag } from "next/cache";
import { verifyStripeCredentials } from "@/lib/stripe";
import {
  PaymentMethodToggleInput,
  paymentMethodToggleSchema,
  PaymentMethodUpdateInput,
  paymentMethodUpdateSchema,
} from "@/lib/validations";

export async function togglePaymentMethodStatus(
  id: number,
  is_active: boolean,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/payment-methods");

  if (id < 1) return { success: false, message: "Invalid payment method ID." };

  const parsed = paymentMethodToggleSchema.safeParse({ is_active });
  if (!parsed.success) {
    return {
      success: false,
      errors: formatZodErrors(parsed.error),
      message: "Invalid status value.",
    };
  }

  const existing = await getPaymentMethodByIdInDB(id);
  if (!existing) {
    return { success: false, message: "Payment method not found." };
  }

  // Guard: Prevent enabling Stripe unless API credentials are verified
  if (is_active && existing.provider.toLowerCase().includes("stripe")) {
    const verification = await verifyStripeCredentials();
    if (!verification.success) {
      return {
        success: false,
        message: `Cannot enable Stripe: ${verification.message}`,
      };
    }
  }

  try {
    const { updated } = await togglePaymentMethodStatusTransaction(
      id,
      is_active,
      Number(user.id),
    );

    revalidateTag("site-footer", "max");
    revalidateTag("checkout", "max");
    revalidatePath("/dashboard/payment-methods");

    await logActivity({
      action: "update_payment_method",
      entity_type: "payment_method",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, name: updated.name, is_active },
    });

    return {
      success: true,
      message: `${updated.name} ${is_active ? "enabled" : "disabled"} successfully.`,
    };
  } catch (error: any) {
    console.error("togglePaymentMethodStatus error:", error);
    await logActivity({
      action: "update_payment_method",
      entity_type: "payment_method",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, is_active, error: String(error?.message || error) },
    });
    return {
      success: false,
      message: error?.message || "Failed to update payment method status.",
    };
  }
}

export async function updatePaymentMethodAction(
  id: number,
  input: PaymentMethodUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/payment-methods");

  if (id < 1) return { success: false, message: "Invalid payment method ID." };

  const parsed = paymentMethodUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: formatZodErrors(parsed.error),
      message: "Please fix the validation errors in the form.",
    };
  }

  const existing = await getPaymentMethodByIdInDB(id);
  if (!existing) {
    return { success: false, message: "Payment method not found." };
  }

  // Guard: Prevent enabling Stripe unless API credentials are verified
  if (parsed.data.is_active && existing.provider.toLowerCase().includes("stripe")) {
    const verification = await verifyStripeCredentials();
    if (!verification.success) {
      return {
        success: false,
        message: `Cannot enable Stripe: ${verification.message}`,
      };
    }
  }

  try {
    const { updated } = await updatePaymentMethodTransaction(
      id,
      parsed.data,
      Number(user.id),
    );

    revalidateTag("site-footer", "max");
    revalidateTag("checkout", "max");
    revalidatePath("/dashboard/payment-methods");

    await logActivity({
      action: "update_payment_method",
      entity_type: "payment_method",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: {
        id,
        name: updated.name,
        is_active: updated.is_active,
        extra_charge: updated.extra_charge,
        sort_order: updated.sort_order,
      },
    });

    return {
      success: true,
      message: `Payment method "${updated.name}" updated successfully.`,
    };
  } catch (error: any) {
    console.error("updatePaymentMethodAction error:", error);
    await logActivity({
      action: "update_payment_method",
      entity_type: "payment_method",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error?.message || error) },
    });
    return {
      success: false,
      message: error?.message || "Failed to update payment method.",
    };
  }
}

export async function verifyStripeCredentialsAction() {
  await assertPermission("read", "/dashboard/payment-methods");
  return await verifyStripeCredentials();
}
