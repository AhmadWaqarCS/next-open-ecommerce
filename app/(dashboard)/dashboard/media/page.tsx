import { assertPermission } from "@/lib/guards";
import { scanMediaStorage } from "@/lib/media-scanner";
import MediaClient from "./media-client";
import { getMediaDashboardDataInDB } from "@/services/media-services";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Media Storage",
  description: "Inspect uploads disk storage, image-to-database connections, orphan files, and broken links.",
};

export default async function MediaDashboardPage() {
  const { permissions } = await assertPermission("read", "/dashboard/media");

  const [scanResult, { categories, products }] = await Promise.all([
    scanMediaStorage(),
    getMediaDashboardDataInDB(),
  ]);

  return (
    <div className="space-y-6 flex-1 flex flex-col pb-6 md:pb-12">
      <MediaClient
        scanData={scanResult}
        categories={categories}
        products={products}
        permissions={permissions}
      />
    </div>
  );
}
