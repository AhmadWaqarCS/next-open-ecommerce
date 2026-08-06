"use server";

import { ActionResponse, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import { togglePaymentMethodStatusTransaction } from "@/services/payment-method-services";
import { revalidatePath, revalidateTag } from "next/cache";
import { verifyStripeCredentials } from "@/lib/stripe";
import prisma from "@/lib/prisma";

export async function togglePaymentMethodStatus(
  id: number,
  is_active: boolean,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/payment-methods");

  if (id < 1) return { success: false, message: "Invalid payment method ID." };

  // Guard: Prevent enabling Stripe unless API credentials are verified
  if (is_active) {
    const existing = await prisma.payment_method.findUnique({
      where: { id },
      select: { provider: true, name: true },
    });

    if (!existing) {
      return { success: false, message: "Payment method not found." };
    }

    if (existing.provider === "stripe" || existing.provider.toLowerCase().includes("stripe")) {
      const verification = await verifyStripeCredentials();
      if (!verification.success) {
        return {
          success: false,
          message: `Cannot enable Stripe: ${verification.message}`,
        };
      }
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
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "update_payment_method",
      entity_type: "payment_method",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, is_active, error: String(error) },
    });
    return { success: false, message: "Failed to update payment method status." };
  }
}

export async function verifyStripeCredentialsAction() {
  await assertPermission("read", "/dashboard/payment-methods");
  return await verifyStripeCredentials();
}

