import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";
import NewsletterTable from "./newsletter-table";
import Pagination from "@/app/(dashboard)/_components/pagination";
import {
  NewsletterFilterParams,
  getNewsletterFilterWhere,
} from "@/lib/filters/newsletter-filters";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Newsletter Subscribers",
  description: "Manage newsletter email subscriptions",
};

export default async function DashboardNewsletterPage({
  searchParams,
}: {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const { permissions } = await assertPermission("read", "/dashboard/newsletter");
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const filterParams: NewsletterFilterParams = {
    id: typeof params?.id === "string" ? params.id : undefined,
    email: typeof params?.email === "string" ? params.email : undefined,
    created_from: typeof params?.created_from === "string" ? params.created_from : undefined,
    created_to: typeof params?.created_to === "string" ? params.created_to : undefined,
  };

  const where = await getNewsletterFilterWhere(filterParams);

  const [subscribers, totalSubscribers] = await Promise.all([
    prisma.newsletter_subscriber.findMany({
      where,
      select: {
        id: true,
        email: true,
        created_at: true,
      },
      take: pageSize,
      skip: skipCount,
      orderBy: { created_at: "desc" },
    }),
    prisma.newsletter_subscriber.count({ where }),
  ]);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <NewsletterTable
        subscribers={subscribers}
        filterParams={filterParams}
        permissions={permissions}
        totalCount={totalSubscribers}
      />

      <Pagination
        totalItems={totalSubscribers}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="subscribers"
      />
    </div>
  );
}
