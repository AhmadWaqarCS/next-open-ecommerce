import { assertPermission } from "@/lib/guards";
import SiteConfigForm from "./site-config-form";
import { getSiteConfigDashboardDataInDB } from "@/services/site-services";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Manage site configuration, branding, localization, and checkout settings",
};

export default async function SettingsPage() {
  const { permissions } = await assertPermission(
    "update",
    "/dashboard/settings",
  );

  const siteConfig = await getSiteConfigDashboardDataInDB();

  return (
    <div className="space-y-6 flex-1 flex flex-col pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
          Site Settings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Configure global store parameters, branding, localization, and
          checkout options.
        </p>
      </div>

      {!siteConfig ? (
        <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <h2 className="text-lg font-bold text-red-600 dark:text-red-400">
            Site Configuration Not Found
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Please run the database seed script to initialize the default site
            configuration.
          </p>
        </div>
      ) : (
        <SiteConfigForm
          initialData={{
            ...siteConfig,
            tax_rate:
              siteConfig.tax_rate !== null
                ? Number(siteConfig.tax_rate)
                : undefined,
            social_links: (siteConfig.social_links ?? {}) as Record<
              string,
              string | null
            >,
            meta_info: (siteConfig.meta_info ?? {}) as Record<string, string>,
          }}
          permissions={permissions}
        />
      )}
    </div>
  );
}
