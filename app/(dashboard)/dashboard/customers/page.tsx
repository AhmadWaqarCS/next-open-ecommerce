import prisma from "@/lib/prisma";
import { assertPermission } from "@/lib/guards";
import CustomerTable from "./customer-table";
import Pagination from "@/app/(dashboard)/_components/pagination";
import {
  CustomerFilterParams,
  getCustomerFilterWhere,
} from "@/lib/filters/customer-filters";
import { getCustomerContactsDashboardDataInDB } from "@/services/customer-contact-services";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customers & Contacts",
  description: "Unified customer directory of buyers and newsletter subscribers",
};

export default async function DashboardCustomersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const { permissions } = await assertPermission("read", "/dashboard/customers");
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const filterParams: CustomerFilterParams = {
    id: typeof params?.id === "string" ? params.id : undefined,
    search: typeof params?.search === "string" ? params.search : undefined,
    email: typeof params?.email === "string" ? params.email : undefined,
    first_name: typeof params?.first_name === "string" ? params.first_name : undefined,
    last_name: typeof params?.last_name === "string" ? params.last_name : undefined,
    phone: typeof params?.phone === "string" ? params.phone : undefined,
    is_customer: typeof params?.is_customer === "string" ? params.is_customer : undefined,
    is_newsletter: typeof params?.is_newsletter === "string" ? params.is_newsletter : undefined,
    is_unsubscribed: typeof params?.is_unsubscribed === "string" ? params.is_unsubscribed : undefined,
    min_spent: typeof params?.min_spent === "string" ? params.min_spent : undefined,
    max_spent: typeof params?.max_spent === "string" ? params.max_spent : undefined,
    min_orders: typeof params?.min_orders === "string" ? params.min_orders : undefined,
    max_orders: typeof params?.max_orders === "string" ? params.max_orders : undefined,
    created_from: typeof params?.created_from === "string" ? params.created_from : undefined,
    created_to: typeof params?.created_to === "string" ? params.created_to : undefined,
  };

  const where = await getCustomerFilterWhere(filterParams);

  const [contacts, totalCount, groups, campaigns] = await prisma.$transaction([
    prisma.customer_contact.findMany({
      where,
      skip: skipCount,
      take: pageSize,
      orderBy: { created_at: "desc" },
    }),
    prisma.customer_contact.count({ where }),
    prisma.email_group.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.email_campaign.findMany({
      where: { status: "draft" },
      select: { id: true, name: true },
      orderBy: { created_at: "desc" },
    }),
  ]);

  const serializedContacts = contacts.map((c) => ({
    id: c.id,
    email: c.email,
    first_name: c.first_name,
    last_name: c.last_name,
    phone: c.phone,
    is_customer: c.is_customer,
    is_newsletter: c.is_newsletter,
    is_unsubscribed: c.is_unsubscribed,
    total_spent: Number(c.total_spent),
    total_orders: c.total_orders,
    created_at: c.created_at.toISOString(),
  }));

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <CustomerTable
        contacts={serializedContacts}
        filterParams={filterParams}
        permissions={permissions}
        totalCount={totalCount}
        groups={groups}
        campaigns={campaigns}
      />

      <Pagination
        totalItems={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="contacts"
      />
    </div>
  );
}
