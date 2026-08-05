import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function subscribeNewsletterTransaction(email: string) {
  return await prisma.$transaction(async (tx) => {
    return await tx.newsletter_subscriber.upsert({
      where: { email },
      update: {},
      create: { email },
    });
  });
}

export async function deleteNewsletterSubscriberTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    return await tx.newsletter_subscriber.delete({
      where: { id },
    });
  });
}

export async function bulkDeleteNewsletterSubscribersTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.newsletter_subscriberWhereInput,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.newsletter_subscriberWhereInput = selectAllScope
      ? (filterWhere || {})
      : { id: { in: ids } };

    return await tx.newsletter_subscriber.deleteMany({
      where: whereCondition,
    });
  });
}

export async function getNewsletterDashboardDataInDB(
  where: Prisma.newsletter_subscriberWhereInput,
  skipCount: number,
  pageSize: number,
) {
  return await prisma.$transaction(async (tx) => {
    const subscribers = await tx.newsletter_subscriber.findMany({
      where,
      select: {
        id: true,
        email: true,
        created_at: true,
      },
      take: pageSize,
      skip: skipCount,
      orderBy: { created_at: "desc" },
    });

    const totalSubscribers = await tx.newsletter_subscriber.count({ where });

    return { subscribers, totalSubscribers };
  });
}

