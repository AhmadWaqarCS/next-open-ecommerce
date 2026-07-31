import { assertPermission } from "@/lib/guards";
import { scanMediaStorage } from "@/lib/media-scanner";
import prisma from "@/lib/prisma";
import MediaClient from "./media-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Media Storage",
  description: "Inspect uploads disk storage, image-to-database connections, orphan files, and broken links.",
};

export default async function MediaDashboardPage() {
  const { permissions } = await assertPermission("read", "/dashboard/media");

  // Parallel fetching of disk storage scan, categories, and products with variants
  const [scanResult, categories, products] = await Promise.all([
    scanMediaStorage(),
    prisma.category.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        variants: {
          where: { deleted_at: null },
          select: { id: true, name: true, sku: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
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
