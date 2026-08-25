import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import prisma from "@/lib/prisma";
import { assertPermission } from "@/lib/guards";
import { notFound } from "next/navigation";
import Link from "next/link";
import CustomerDetailClient from "./customer-detail-client";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function CustomerDetailPage(props: PageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <CustomerDetailPageContent {...props} />
    </Suspense>
  );
}

async function CustomerDetailPageContent({ params }: PageProps) {
  await assertPermission("read", "/dashboard/customers");
  const { id } = await params;
  const contactId = Number(id);

  if (isNaN(contactId)) notFound();

  const contact = await prisma.customer_contact.findUnique({
    where: { id: contactId },
  });

  if (!contact) notFound();

  const orders = await prisma.order.findMany({
    where: {
      customer_email: contact.email,
      deleted_at: null,
    },
    include: {
      items: true,
    },
    orderBy: { placed_at: "desc" },
  });

  const serializedContact = {
    ...contact,
    total_spent: Number(contact.total_spent),
    categories_bought: (contact.categories_bought as string[]) || [],
    locations: (contact.locations as string[]) || [],
    created_at: contact.created_at.toISOString(),
  };

  const serializedOrders = orders.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    total: Number(o.total),
    payment_status: o.payment_status,
    fulfillment_status: o.fulfillment_status,
    currency: o.currency,
    items_count: o.items.reduce((acc, i) => acc + i.quantity, 0),
    placed_at: o.placed_at.toISOString(),
  }));

  return (
    <CustomerDetailClient
      contact={serializedContact}
      orders={serializedOrders}
    />
  );
}
