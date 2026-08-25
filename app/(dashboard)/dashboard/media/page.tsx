import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { assertPermission } from "@/lib/guards";
import MediaClient from "./media-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Media Storage",
  description: "Browse and manage uploaded media files across all storage providers.",
};

export default function MediaDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <MediaDashboardPageContent />
    </Suspense>
  );
}

async function MediaDashboardPageContent() {
  const { permissions } = await assertPermission("read", "/dashboard/media");

  return (
    <div className="space-y-6 flex-1 flex flex-col pb-6 md:pb-12">
      <MediaClient permissions={permissions} />
    </div>
  );
}
