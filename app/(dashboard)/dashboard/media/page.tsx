import { assertPermission } from "@/lib/guards";
import MediaClient from "./media-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Media Storage",
  description: "Browse and manage uploaded media files across all storage providers.",
};

export default async function MediaDashboardPage() {
  const { permissions } = await assertPermission("read", "/dashboard/media");

  return (
    <div className="space-y-6 flex-1 flex flex-col pb-6 md:pb-12">
      <MediaClient permissions={permissions} />
    </div>
  );
}
