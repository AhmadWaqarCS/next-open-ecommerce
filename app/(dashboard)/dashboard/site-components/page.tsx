import { assertPermission } from "@/lib/guards";
import SiteComponentTable from "./_components/site-component-table";
import { getSiteComponentsDashboardDataInDB } from "@/services/site-component-services";

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

  const components = await getSiteComponentsDashboardDataInDB();

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <SiteComponentTable
        components={components as any}
        permissions={permissions}
      />
    </div>
  );
}
