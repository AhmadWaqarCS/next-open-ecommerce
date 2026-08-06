import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";
import ActivityLogTable from "./activity-log-table";
import Pagination from "@/app/(dashboard)/_components/pagination";
import {
  ActivityLogFilterParams,
  getActivityLogFilterWhere,
} from "@/lib/filters/activity-log-filters";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activity Logs",
  description: "Audit trail of admin operations, system actions, and user activity events",
};

export default async function DashboardActivityLogsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await assertPermission("read", "/dashboard/activity-logs");
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const filterParams: ActivityLogFilterParams = {
    search: typeof params?.search === "string" ? params.search : undefined,
    user_email: typeof params?.user_email === "string" ? params.user_email : undefined,
    action: typeof params?.action === "string" ? params.action : undefined,
    entity_type: typeof params?.entity_type === "string" ? params.entity_type : undefined,
    status: typeof params?.status === "string" ? params.status : undefined,
    created_from: typeof params?.created_from === "string" ? params.created_from : undefined,
    created_to: typeof params?.created_to === "string" ? params.created_to : undefined,
  };

  const where = getActivityLogFilterWhere(filterParams);

  // Execute direct DB read queries inside page as mandated by project guidelines
  const [logsRaw, totalLogs, distinctEntitiesRaw] = await Promise.all([
    prisma.activity_log.findMany({
      where,
      skip: skipCount,
      take: pageSize,
      orderBy: { created_at: "desc" },
    }),
    prisma.activity_log.count({ where }),
    prisma.activity_log.findMany({
      select: { entity_type: true },
      distinct: ["entity_type"],
      orderBy: { entity_type: "asc" },
    }),
  ]);

  const serializedLogs = logsRaw.map((log) => ({
    id: log.id,
    action: log.action,
    entity_type: log.entity_type,
    entity_id: log.entity_id,
    user_id: log.user_id,
    user_email: log.user_email,
    user_role: log.user_role,
    status: log.status,
    details: log.details,
    ip_address: log.ip_address,
    created_at: log.created_at.toISOString(),
  }));

  const distinctEntityTypes = distinctEntitiesRaw
    .map((e) => e.entity_type)
    .filter(Boolean);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <ActivityLogTable
        logs={serializedLogs}
        filterParams={filterParams}
        totalCount={totalLogs}
        distinctEntityTypes={distinctEntityTypes}
      />

      <Pagination
        totalItems={totalLogs}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="activity logs"
      />
    </div>
  );
}
