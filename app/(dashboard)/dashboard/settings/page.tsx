import { assertPermission } from "@/lib/guards";
import SiteConfigForm from "./site-config-form";
import { getSiteConfigDashboardDataInDB } from "@/services/site-services";
import { getActiveThemesWithComponentsInDB } from "@/services/theme-services";
import type { Metadata } from "next";
import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Manage site configuration, branding, theme components, and checkout settings",
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <SettingsPageContent />
    </Suspense>
  );
}

async function SettingsPageContent() {
  const { permissions } = await assertPermission(
    "read",
    "/dashboard/settings",
  );

  const [siteConfig, activeThemes] = await Promise.all([
    getSiteConfigDashboardDataInDB(),
    getActiveThemesWithComponentsInDB(),
  ]);

  return (
    <div className="flex-1 flex flex-col pb-12">
      {!siteConfig ? (
        <div className="flex flex-col items-center justify-center p-12 bg-dashboard-card border border-dashboard-border rounded-2xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-dashboard-danger-subtle text-dashboard-danger flex items-center justify-center text-xl font-bold mb-4">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-dashboard-danger">
            Site Configuration Not Found
          </h2>
          <p className="text-sm text-dashboard-muted mt-2 max-w-md">
            Please run the database seed script to initialize the default site configuration record.
          </p>
        </div>
      ) : (
        <SiteConfigForm
          initialData={{
            ...siteConfig,
            tax_rate:
              siteConfig.tax_rate !== null && siteConfig.tax_rate !== undefined
                ? Number(siteConfig.tax_rate)
                : undefined,
            social_links: (siteConfig.social_links ?? {}) as Record<
              string,
              string | null
            >,
            meta_info: (siteConfig.meta_info ?? {}) as Record<string, string>,
            theme_config: (siteConfig.theme_config ?? {}) as Record<string, any>,
            header_config: (siteConfig.header_config ?? {}) as Record<string, any>,
            footer_config: (siteConfig.footer_config ?? {}) as Record<string, any>,
          }}
          activeThemes={activeThemes as any}
          permissions={permissions}
        />
      )}
    </div>
  );
}
