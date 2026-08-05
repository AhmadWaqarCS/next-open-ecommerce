"use server";

import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  PaymentTransactionCreateInput,
  PaymentTransactionUpdateInput,
  paymentTransactionCreateSchema,
  paymentTransactionUpdateSchema,
} from "@/lib/validations";
import {
  createPaymentTransactionInDB,
  updatePaymentTransactionInDB,
  deletePaymentTransactionPermanentlyInDB,
} from "@/services/payment-services";
import { revalidatePath } from "next/cache";

export async function createPaymentTransaction(
  data: PaymentTransactionCreateInput,
): Promise<ActionResponse> {
  await assertPermission("create", "/dashboard/orders");

  const validatedFields = paymentTransactionCreateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const {
    order_id,
    provider,
    provider_transaction_id,
    provider_session_id,
    provider_status,
    amount,
    currency,
    status,
    raw_response,
    confirmed_by,
    confirmed_at,
  } = validatedFields.data;

  try {
    await createPaymentTransactionInDB({
      order_id,
      provider,
      provider_transaction_id: provider_transaction_id || null,
      provider_session_id: provider_session_id || null,
      provider_status: provider_status || null,
      amount,
      currency,
      status,
      raw_response: raw_response || null,
      confirmed_by: confirmed_by || null,
      confirmed_at: confirmed_at ? new Date(confirmed_at) : null,
    });

    revalidatePath("/dashboard/orders");

    return { success: true, message: "Payment transaction recorded successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to record payment transaction." };
  }
}

export async function updatePaymentTransaction(
  id: number,
  data: PaymentTransactionUpdateInput,
): Promise<ActionResponse> {
  await assertPermission("update", "/dashboard/orders");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const validatedFields = paymentTransactionUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const {
    provider_transaction_id,
    provider_session_id,
    provider_status,
    amount,
    currency,
    status,
    raw_response,
    confirmed_by,
    confirmed_at,
  } = validatedFields.data;

  try {
    await updatePaymentTransactionInDB(id, {
      provider_transaction_id,
      provider_session_id,
      provider_status,
      amount,
      currency,
      status,
      raw_response: raw_response !== undefined ? raw_response || null : undefined,
      confirmed_by,
      confirmed_at: confirmed_at ? new Date(confirmed_at) : undefined,
    });

    revalidatePath("/dashboard/orders");

    return { success: true, message: "Payment transaction updated successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update payment transaction." };
  }
}

export async function deletePaymentTransaction(
  id: number,
): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/orders");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await deletePaymentTransactionPermanentlyInDB(id);

    revalidatePath("/dashboard/orders");

    return { success: true, message: "Payment transaction deleted." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to delete payment transaction." };
  }
}
