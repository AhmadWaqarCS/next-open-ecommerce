import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { notFound } from "next/navigation";
import { assertPermission } from "@/lib/guards";
import {
  getSingleStorageOptionFromDB,
  getAllStorageOptionsFromDB,
  getStorageMetrics,
} from "@/services/storage-services";
import StorageDetailClient from "./storage-detail-client";

export const metadata = {
  title: "Storage Detail - Control Panel",
  description: "View and manage specific storage option configuration and data metrics.",
};

interface PageProps {
  params: Promise<{ key: string }>;
}

export default function StorageDetailPage(props: PageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <StorageDetailPageContent {...props} />
    </Suspense>
  );
}

async function StorageDetailPageContent({ params }: PageProps) {
  await assertPermission("read", "/dashboard/storages");

  const { key } = await params;

  const [option, allOptions, metrics] = await Promise.all([
    getSingleStorageOptionFromDB(key),
    getAllStorageOptionsFromDB(),
    getStorageMetrics(key),
  ]);

  if (!option) {
    notFound();
  }

  return (
    <StorageDetailClient
      option={option}
      allOptions={allOptions}
      metrics={metrics}
    />
  );
}
