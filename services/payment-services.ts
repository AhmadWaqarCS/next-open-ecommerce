import { Prisma } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";

export async function getPaymentTransactionsByOrderFromDB(orderId: number) {
  return await prisma.payment_transaction.findMany({
    where: { order_id: orderId },
    orderBy: { created_at: "desc" },
  });
}

export async function getPaymentTransactionByProviderIdFromDB(
  providerTransactionId: string,
) {
  return await prisma.payment_transaction.findFirst({
    where: { provider_transaction_id: providerTransactionId },
  });
}

export async function createPaymentTransactionInDB(data: {
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
}) {
  return await prisma.payment_transaction.create({
    data: {
      ...data,
      raw_response: data.raw_response ?? Prisma.JsonNull,
    },
  });
}

export async function updatePaymentTransactionInDB(
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
  return await prisma.payment_transaction.update({
    where: { id },
    data: {
      ...data,
      raw_response:
        data.raw_response !== undefined
          ? (data.raw_response ?? Prisma.JsonNull)
          : undefined,
    },
  });
}

export async function deletePaymentTransactionPermanentlyInDB(id: number) {
  return await prisma.payment_transaction.delete({ where: { id } });
}

export async function getOrderRefundsByOrderFromDB(orderId: number) {
  return await prisma.order_refund.findMany({
    where: { order_id: orderId },
    orderBy: { created_at: "desc" },
  });
}

export async function createOrderRefundInDB(data: {
  order_id: number;
  amount: number;
  reason?: string | null;
  provider_refund_id?: string | null;
  status?: string;
  refunded_at?: Date | null;
  created_by: number;
}) {
  return await prisma.order_refund.create({ data });
}

export async function updateOrderRefundInDB(
  id: number,
  data: {
    amount?: number;
    reason?: string | null;
    provider_refund_id?: string | null;
    status?: string;
    refunded_at?: Date | null;
  },
) {
  return await prisma.order_refund.update({ where: { id }, data });
}

export async function deleteOrderRefundPermanentlyInDB(id: number) {
  return await prisma.order_refund.delete({ where: { id } });
}
