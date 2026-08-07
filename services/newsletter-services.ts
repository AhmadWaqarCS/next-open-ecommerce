import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { upsertCustomerContactInDB } from "./customer-contact-services";

export async function subscribeNewsletterTransaction(email: string) {
  return await upsertCustomerContactInDB({
    email: email.trim().toLowerCase(),
    is_newsletter: true,
  });
}

export async function deleteNewsletterSubscriberTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    return await tx.customer_contact.update({
      where: { id },
      data: { is_newsletter: false },
    });
  });
}

export async function bulkDeleteNewsletterSubscribersTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.customer_contactWhereInput,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.customer_contactWhereInput = selectAllScope
      ? { ...filterWhere, is_newsletter: true }
      : { id: { in: ids } };

    return await tx.customer_contact.updateMany({
      where: whereCondition,
      data: { is_newsletter: false },
    });
  });
}

export async function getNewsletterDashboardDataInDB(
  where: Prisma.customer_contactWhereInput,
  skipCount: number,
  pageSize: number,
) {
  const whereCondition: Prisma.customer_contactWhereInput = {
    ...where,
    is_newsletter: true,
  };

  return await prisma.$transaction(async (tx) => {
    const subscribers = await tx.customer_contact.findMany({
      where: whereCondition,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        created_at: true,
      },
      take: pageSize,
      skip: skipCount,
      orderBy: { created_at: "desc" },
    });

    const totalSubscribers = await tx.customer_contact.count({ where: whereCondition });

    return { subscribers, totalSubscribers };
  });
}
