import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

export async function upsertNewsletterSubscriberInDB(email: string) {
  return await prisma.newsletter_subscriber.upsert({
    where: { email },
    update: {},
    create: { email },
  });
}

export async function deleteNewsletterSubscriberInDB(id: number) {
  return await prisma.newsletter_subscriber.delete({
    where: { id },
  });
}

export async function bulkDeleteNewsletterSubscribersInDB(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.newsletter_subscriberWhereInput
) {
  let whereCondition: Prisma.newsletter_subscriberWhereInput;

  if (selectAllScope) {
    whereCondition = filterWhere || {};
  } else {
    whereCondition = { id: { in: ids } };
  }

  return await prisma.newsletter_subscriber.deleteMany({
    where: whereCondition,
  });
}
