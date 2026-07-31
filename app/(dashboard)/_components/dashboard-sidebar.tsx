import { getRolePermissions } from "@/lib/permissions";
import { User } from "next-auth";
import Link from "next/link";
import { signOut } from "@/lib/auth";
import SidebarLinks from "./sidebar-links";

export default async function DashboardSidebar({ user }: { user: User }) {
  const { accessPaths } = await getRolePermissions(user.role);

  return (
    <aside className="w-full md:w-64 bg-white dark:bg-zinc-900 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-auto md:h-screen md:sticky md:top-0 flex-shrink-0 z-40">
      {/* Sidebar Header Brand */}
      <div className="h-16 flex items-center gap-2.5 px-6 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </div>
        <Link
          href="/dashboard"
          className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          OpenCommerce
        </Link>
      </div>

      {/* Navigation List */}
      <SidebarLinks links={accessPaths} userRole={user.role} />

      {/* User profile card & Log Out */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mb-1">
              Logged in
            </p>
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate leading-none">
              {user.email}
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer"
              title="Sign Out"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
