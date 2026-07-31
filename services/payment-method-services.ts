import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

const paymentMethodSelect = {
  id: true,
  name: true,
  description: true,
  provider: true,
  provider_config: true,
  extra_charge: true,
  instructions: true,
  is_active: true,
  sort_order: true,
  created_at: true,
  created_by: true,
  updated_at: true,
  updated_by: true,
  deleted_at: true,
  deleted_by: true,
};

export async function createPaymentMethodInDB(data: {
  name: string;
  description?: string | null;
  provider: string;
  provider_config?: Record<string, unknown> | null;
  extra_charge?: number | null;
  instructions?: string | null;
  is_active?: boolean;
  sort_order?: number;
  created_by: number;
  updated_by: number;
}) {
  return await prisma.payment_method.create({
    data: data as any,
    select: paymentMethodSelect,
  });
}

export async function updatePaymentMethodInDB(
  id: number,
  data: {
    name?: string;
    description?: string | null;
    provider?: string;
    provider_config?: Record<string, unknown> | null;
    extra_charge?: number | null;
    instructions?: string | null;
    is_active?: boolean;
    sort_order?: number;
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
) {
  return await prisma.payment_method.update({
    where: { id },
    data: data as any,
    select: paymentMethodSelect,
  });
}

export async function deletePaymentMethodPermanentlyInDB(id: number) {
  return await prisma.payment_method.delete({
    where: { id },
    select: paymentMethodSelect,
  });
}

export async function bulkUpdatePaymentMethodsInDB(
  ids: number[],
  data: {
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
  selectAllScope: boolean = false,
  isTrash: boolean = false,
  filterWhere?: Prisma.payment_methodWhereInput,
) {
  const whereCondition: Prisma.payment_methodWhereInput = selectAllScope
    ? (filterWhere ?? (isTrash ? { NOT: { deleted_at: null } } : { deleted_at: null }))
    : { id: { in: ids } };

  return await prisma.payment_method.updateMany({
    where: whereCondition,
    data,
  });
}

export async function bulkDeletePaymentMethodsPermanentlyInDB(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.payment_methodWhereInput,
) {
  const whereCondition: Prisma.payment_methodWhereInput = selectAllScope
    ? (filterWhere ?? { NOT: { deleted_at: null } })
    : { id: { in: ids } };

  return await prisma.payment_method.deleteMany({
    where: whereCondition,
  });
}
