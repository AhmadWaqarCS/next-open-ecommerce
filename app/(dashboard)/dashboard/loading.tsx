export default function DashboardLoading() {
  return (
    <div className="space-y-6 flex-1 flex flex-col animate-pulse">
      {/* Top Banner Skeleton Container */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2.5 max-w-md">
            <div className="h-4 w-32 bg-indigo-100 dark:bg-indigo-950/80 rounded-full" />
            <div className="h-7 w-64 bg-zinc-200 dark:bg-zinc-700/80 rounded-xl" />
            <div className="h-4 w-80 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
          </div>
          <div className="h-10 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-2xl shrink-0" />
        </div>
      </div>

      {/* Main Content / Data Table Skeleton Container */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs flex-1 space-y-6">
        {/* Table Filter Bar Placeholder */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
          <div className="h-10 w-full sm:w-72 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="h-10 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
            <div className="h-10 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          </div>
        </div>

        {/* Table Header Placeholder */}
        <div className="grid grid-cols-4 gap-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="h-4 w-24 bg-zinc-300 dark:bg-zinc-700/80 rounded-md" />
          <div className="h-4 w-32 bg-zinc-300 dark:bg-zinc-700/80 rounded-md" />
          <div className="h-4 w-20 bg-zinc-300 dark:bg-zinc-700/80 rounded-md" />
          <div className="h-4 w-16 bg-zinc-300 dark:bg-zinc-700/80 rounded-md justify-self-end" />
        </div>

        {/* Skeleton Table Rows */}
        <div className="space-y-4 pt-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="grid grid-cols-4 gap-4 items-center py-3 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="space-y-1.5">
                <div className="h-4 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                <div className="h-3 w-48 bg-zinc-100 dark:bg-zinc-800/50 rounded-md" />
              </div>
              <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
              <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
              <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl justify-self-end" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
