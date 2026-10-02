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
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ key: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { key } = await params;
  const option = await getSingleStorageOptionFromDB(key);

  return {
    title: option ? `${option.name} — Storage Options` : "Storage Option Details",
    description: option?.description || "View and test storage driver configuration and metrics.",
  };
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
