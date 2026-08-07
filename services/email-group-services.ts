import prisma from "@/lib/prisma";

export async function createEmailGroupTransaction(
  data: {
    name: string;
    description?: string | null;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    return await tx.email_group.create({
      data: {
        name: data.name,
        description: data.description || null,
        created_by: userId,
        updated_by: userId,
      },
    });
  });
}

export async function updateEmailGroupTransaction(
  id: number,
  data: {
    name?: string;
    description?: string | null;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    return await tx.email_group.update({
      where: { id },
      data: {
        ...data,
        updated_by: userId,
      },
    });
  });
}

export async function deleteEmailGroupTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    await tx.email_group_member.deleteMany({
      where: { group_id: id },
    });
    return await tx.email_group.delete({
      where: { id },
    });
  });
}

export async function addCustomerContactsToGroupTransaction(
  groupId: number,
  contactIds: number[],
) {
  return await prisma.$transaction(async (tx) => {
    for (const contactId of contactIds) {
      const existing = await tx.email_group_member.findUnique({
        where: {
          group_id_customer_contact_id: {
            group_id: groupId,
            customer_contact_id: contactId,
          },
        },
      });

      if (!existing) {
        await tx.email_group_member.create({
          data: {
            group_id: groupId,
            customer_contact_id: contactId,
          },
        });
      }
    }

    const memberCount = await tx.email_group_member.count({
      where: { group_id: groupId },
    });

    return await tx.email_group.update({
      where: { id: groupId },
      data: { member_count: memberCount },
    });
  });
}

export async function removeCustomerContactFromGroupTransaction(
  groupId: number,
  contactId: number,
) {
  return await prisma.$transaction(async (tx) => {
    await tx.email_group_member.deleteMany({
      where: {
        group_id: groupId,
        customer_contact_id: contactId,
      },
    });

    const memberCount = await tx.email_group_member.count({
      where: { group_id: groupId },
    });

    return await tx.email_group.update({
      where: { id: groupId },
      data: { member_count: memberCount },
    });
  });
}

export async function getEmailGroupsDashboardDataInDB(
  where?: any,
  skip: number = 0,
  take: number = 10,
) {
  const [groups, totalCount] = await prisma.$transaction([
    prisma.email_group.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
      include: {
        _count: {
          select: { members: true },
        },
      },
    }),
    prisma.email_group.count({ where }),
  ]);

  return { groups, totalCount };
}
