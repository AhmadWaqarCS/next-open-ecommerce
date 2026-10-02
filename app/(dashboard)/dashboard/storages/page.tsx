import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { assertPermission } from "@/lib/guards";
import { getStoragesDashboardDataInDB } from "@/services/storage-services";
import StoragesTable from "./storages-table";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Storage Options",
  description: "Manage system storage mediums, verify environment keys, and execute data migrations.",
};

export default function StoragePage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <StoragePageContent />
    </Suspense>
  );
}

async function StoragePageContent() {
  const { permissions } = await assertPermission("read", "/dashboard/storages");
  const { options, activeDriverEnv } = await getStoragesDashboardDataInDB();

  return (
    <div className="flex-1 flex flex-col">
      <StoragesTable
        options={options}
        permissions={permissions}
        activeDriverEnv={activeDriverEnv}
      />
    </div>
  );
}
