import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import prisma from "@/lib/prisma";
import { assertPermission } from "@/lib/guards";
import { notFound } from "next/navigation";
import EmailGroupDetailClient from "./email-group-detail-client";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EmailGroupDetailPage(props: PageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <EmailGroupDetailPageContent {...props} />
    </Suspense>
  );
}

async function EmailGroupDetailPageContent({ params }: PageProps) {
  await assertPermission("read", "/dashboard/email-groups");
  const { id } = await params;
  const groupId = Number(id);

  if (isNaN(groupId)) notFound();

  const group = await prisma.email_group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          customer_contact: true,
        },
        orderBy: { added_at: "desc" },
      },
    },
  });

  if (!group) notFound();

  const serializedMembers = group.members.map((m) => ({
    id: m.id,
    added_at: m.added_at.toISOString(),
    contact: {
      id: m.customer_contact.id,
      email: m.customer_contact.email,
      first_name: m.customer_contact.first_name,
      last_name: m.customer_contact.last_name,
      is_customer: m.customer_contact.is_customer,
      is_newsletter: m.customer_contact.is_newsletter,
      is_unsubscribed: m.customer_contact.is_unsubscribed,
      total_spent: Number(m.customer_contact.total_spent),
    },
  }));

  return (
    <EmailGroupDetailClient
      group={{
        id: group.id,
        name: group.name,
        description: group.description,
        member_count: group.member_count,
        created_at: group.created_at.toISOString(),
      }}
      members={serializedMembers}
    />
  );
}
