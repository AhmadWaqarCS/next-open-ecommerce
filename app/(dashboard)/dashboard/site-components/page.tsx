import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";
import SiteComponentTable from "./_components/site-component-table";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Site Components",
  description: "Manage system and custom UI components registered for dynamic storefront pages.",
};

export default async function DashboardSiteComponentsPage() {
  const { permissions } = await assertPermission(
    "read",
    "/dashboard/site-components",
  );

  const components = await prisma.site_component.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <SiteComponentTable
        components={components as any}
        permissions={permissions}
      />
    </div>
  );
}
