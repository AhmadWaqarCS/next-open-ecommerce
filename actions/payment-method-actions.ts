"use server";

import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  PaymentMethodCreateInput,
  PaymentMethodUpdateInput,
  paymentMethodCreateSchema,
  paymentMethodUpdateSchema,
} from "@/lib/validations";
import {
  createPaymentMethodTransaction,
  updatePaymentMethodTransaction,
  deletePaymentMethodTransaction,
  restorePaymentMethodTransaction,
  permanentlyDeletePaymentMethodTransaction,
  bulkDeletePaymentMethodsTransaction,
  bulkRestorePaymentMethodsTransaction,
  bulkPermanentlyDeletePaymentMethodsTransaction,
} from "@/services/payment-method-services";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  PaymentMethodFilterParams,
  getPaymentMethodFilterWhere,
} from "@/lib/filters/payment-method-filters";
import { verifyStripeCredentials } from "@/lib/stripe";

import prisma from "@/lib/prisma";

export async function createPaymentMethod(
  _data: PaymentMethodCreateInput,
): Promise<ActionResponse> {
  await assertPermission("create", "/dashboard/payment-methods");

  return {
    success: false,
    message: "Creating new payment methods is disabled. Payment methods are fixed by seed configuration.",
  };
}

export async function updatePaymentMethod(
  id: number,
  data: PaymentMethodUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/payment-methods");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const validatedFields = paymentMethodUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const {
    name,
    description,
    provider,
    provider_config,
    extra_charge,
    instructions,
    is_active,
    sort_order,
  } = validatedFields.data;

  // ── SERVER ACTION GUARD: Prevent enabling Stripe unless API credentials are verified ──
  if (is_active === true) {
    let targetProvider: string | undefined = provider;
    if (!targetProvider) {
      const existing = await prisma.payment_method.findUnique({
        where: { id },
        select: { provider: true },
      });
      targetProvider = existing?.provider;
    }

    if (targetProvider === "stripe" || targetProvider?.toLowerCase().includes("stripe")) {
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
    await updatePaymentMethodTransaction(
      id,
      {
        name,
        description: description !== undefined ? description || null : undefined,
        provider,
        provider_config:
          provider_config !== undefined ? provider_config ?? null : undefined,
        extra_charge:
          extra_charge !== undefined ? extra_charge ?? null : undefined,
        instructions:
          instructions !== undefined ? instructions || null : undefined,
        is_active,
        sort_order,
      },
      Number(user.id),
    );

    revalidateTag("site-footer", "max");
    revalidateTag("checkout", "max");
    revalidatePath("/dashboard/payment-methods");

    return { success: true, message: "Payment method updated successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update payment method." };
  }
}

export async function deletePaymentMethod(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/payment-methods");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await deletePaymentMethodTransaction(id, Number(user.id));

    revalidateTag("site-footer", "max");
    revalidateTag("checkout", "max");
    revalidatePath("/dashboard/payment-methods");
    revalidatePath("/dashboard/payment-methods/trash");

    return { success: true, message: "Payment method deleted successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to delete payment method." };
  }
}

export async function restorePaymentMethod(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/payment-methods");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await restorePaymentMethodTransaction(id, Number(user.id));

    revalidateTag("site-footer", "max");
    revalidateTag("checkout", "max");
    revalidatePath("/dashboard/payment-methods/trash");
    revalidatePath("/dashboard/payment-methods");

    return { success: true, message: "Payment method restored successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to restore payment method." };
  }
}

export async function permanentlyDeletePaymentMethod(
  id: number,
): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/payment-methods");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await permanentlyDeletePaymentMethodTransaction(id);

    revalidateTag("site-footer", "max");
    revalidateTag("checkout", "max");
    revalidatePath("/dashboard/payment-methods/trash");

    return {
      success: true,
      message: "Payment method permanently deleted.",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to permanently delete payment method.",
    };
  }
}

export async function bulkDeletePaymentMethods(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: PaymentMethodFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/payment-methods");
  const filterWhere =
    selectAllScope && filterParams
      ? await getPaymentMethodFilterWhere(filterParams, false)
      : undefined;

  try {
    await bulkDeletePaymentMethodsTransaction(
      ids,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );

    revalidateTag("site-footer", "max");
    revalidateTag("checkout", "max");
    revalidatePath("/dashboard/payment-methods");
    revalidatePath("/dashboard/payment-methods/trash");

    return {
      success: true,
      message: "Selected payment methods moved to trash.",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to delete selected payment methods.",
    };
  }
}

export async function bulkRestorePaymentMethods(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: PaymentMethodFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/payment-methods");
  const filterWhere =
    selectAllScope && filterParams
      ? await getPaymentMethodFilterWhere(filterParams, true)
      : undefined;

  try {
    await bulkRestorePaymentMethodsTransaction(
      ids,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );

    revalidateTag("site-footer", "max");
    revalidateTag("checkout", "max");
    revalidatePath("/dashboard/payment-methods/trash");
    revalidatePath("/dashboard/payment-methods");

    return { success: true, message: "Selected payment methods restored." };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to restore selected payment methods.",
    };
  }
}

export async function bulkPermanentlyDeletePaymentMethods(
  ids: number[],
  selectAllScope: boolean = false,
  filterParams?: PaymentMethodFilterParams,
): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/payment-methods");
  const filterWhere =
    selectAllScope && filterParams
      ? await getPaymentMethodFilterWhere(filterParams, true)
      : undefined;

  try {
    await bulkPermanentlyDeletePaymentMethodsTransaction(
      ids,
      selectAllScope,
      filterWhere,
    );

    revalidateTag("site-footer", "max");
    revalidateTag("checkout", "max");
    revalidatePath("/dashboard/payment-methods/trash");

    return {
      success: true,
      message: "Selected payment methods permanently deleted.",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to permanently delete selected payment methods.",
    };
  }
}

export async function verifyStripeCredentialsAction() {
  await assertPermission("read", "/dashboard/payment-methods");
  return await verifyStripeCredentials();
}
