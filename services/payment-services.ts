import { Prisma } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";

export async function createPaymentTransactionTransaction(
  data: {
    order_id: number;
    provider: string;
    provider_transaction_id?: string | null;
    provider_session_id?: string | null;
    provider_status?: string | null;
    amount: number;
    currency?: string;
    status?: string;
    raw_response?: object | null;
    confirmed_by?: number | null;
    confirmed_at?: Date | null;
  },
) {
  return await prisma.$transaction(async (tx) => {
    return await tx.payment_transaction.create({
      data: {
        ...data,
        raw_response: data.raw_response ?? Prisma.JsonNull,
      },
    });
  });
}

export async function updatePaymentTransactionTransaction(
  id: number,
  data: {
    provider_transaction_id?: string | null;
    provider_session_id?: string | null;
    provider_status?: string | null;
    amount?: number;
    currency?: string;
    status?: string;
    raw_response?: object | null;
    confirmed_by?: number | null;
    confirmed_at?: Date | null;
  },
) {
  return await prisma.$transaction(async (tx) => {
    return await tx.payment_transaction.update({
      where: { id },
      data: {
        ...data,
        raw_response:
          data.raw_response !== undefined
            ? (data.raw_response ?? Prisma.JsonNull)
            : undefined,
      },
    });
  });
}

export async function permanentlyDeletePaymentTransactionTransaction(
  id: number,
) {
  return await prisma.$transaction(async (tx) => {
    return await tx.payment_transaction.delete({ where: { id } });
  });
}

export async function createOrderRefundTransaction(
  data: {
    order_id: number;
    amount: number;
    reason?: string | null;
    provider_refund_id?: string | null;
    status?: string;
    refunded_at?: Date | null;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    return await tx.order_refund.create({
      data: {
        ...data,
        created_by: userId,
      },
    });
  });
}

export async function updateOrderRefundTransaction(
  id: number,
  data: {
    amount?: number;
    reason?: string | null;
    provider_refund_id?: string | null;
    status?: string;
    refunded_at?: Date | null;
  },
) {
  return await prisma.$transaction(async (tx) => {
    return await tx.order_refund.update({ where: { id }, data });
  });
}

export async function permanentlyDeleteOrderRefundTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    return await tx.order_refund.delete({ where: { id } });
  });
}
