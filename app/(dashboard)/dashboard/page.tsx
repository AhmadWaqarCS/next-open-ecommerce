import { assertPermission } from "@/lib/guards";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Next OpenSource Ecommerce Dashboard",
};

export default async function DashboardHomePage() {
  const { permissions } = await assertPermission("read", "/dashboard");
  return (
    <div className="space-y-6 pb-6 md:pb-12">
      {/* Welcome banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xs relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
            Welcome to your Dashboard
          </h1>
          <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Configure system configurations, manage roles and permissions, register administrative users, and view storefront actions securely from the dashboard panels.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-linear-to-l from-indigo-500/5 to-transparent pointer-events-none hidden md:block" />
      </div>

      {/* Grid panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Users Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <a href="/dashboard/users" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Manage Users &rarr;
            </a>
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Users</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Create administrative accounts, change role assignments, active/deactive status, or restore soft-deleted profiles.
          </p>
        </div>

        {/* Roles Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <a href="/dashboard/roles" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Manage Roles &rarr;
            </a>
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Roles</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Create user roles, modify feature permissions, configure granular read/write access mappings.
          </p>
        </div>
      </div>
    </div>
  );
}
