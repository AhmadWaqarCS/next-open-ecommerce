import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardSidebar from "../_components/dashboard-sidebar";
import { ToastProvider } from "../_components/toast-context";
import { ToastContainer } from "../_components/toast-container";
import ThemeToggle from "../_components/theme-toggle";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row bg-slate-50 dark:bg-zinc-950">
      <DashboardSidebar user={session.user} />
      <ToastProvider>
        <ToastContainer />
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top navigation header */}
          <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs shadow-xs flex-shrink-0">
            <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Control Panel
            </h2>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900/50 dark:text-indigo-300">
                {session.user.role}
              </span>
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hidden sm:inline">
                {session.user.email}
              </span>
            </div>
          </header>
          {/* Main workspace */}
          <main className="flex-1 p-6 md:p-8 animate-fade-in flex flex-col min-h-[calc(100vh-4rem)]">
            {children}
          </main>
        </div>
      </ToastProvider>
    </div>
  );
}
