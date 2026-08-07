"use client";

import { useState } from "react";
import Link from "next/link";
import { StorageOptionDTO } from "@/services/storage-services";
import { activateStorageAction, verifyStorageEnvAction } from "@/actions/storage-actions";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import MigrationModal from "./_components/migration-modal";

interface StorageClientProps {
  options: StorageOptionDTO[];
  userRole?: string;
}

export default function StorageClient({ options: initialOptions }: StorageClientProps) {
  const { toast } = useToast();
  const [options, setOptions] = useState<StorageOptionDTO[]>(initialOptions);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [isMigrationOpen, setIsMigrationOpen] = useState(false);

  const handleVerify = async (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoadingKey(key);
    try {
      const res = await verifyStorageEnvAction(key);
      if (res.valid) {
        toast("Environment variables and connection verified successfully!", "success");
      } else {
        toast(res.error || "Verification failed. Please check your .env settings.", "error");
      }
    } catch (err: any) {
      toast(err?.message || "Verification test failed.", "error");
    } finally {
      setLoadingKey(null);
    }
  };

  const handleActivate = async (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoadingKey(key);
    try {
      const res = await activateStorageAction(key);
      if (res.success) {
        toast(res.message || "Storage option activated!", "success");
        setOptions((prev) =>
          prev.map((opt) => ({
            ...opt,
            is_active: opt.key === key,
          }))
        );
      } else {
        toast(res.message || "Failed to activate storage option.", "error");
      }
    } catch (err: any) {
      toast(err?.message || "Failed to activate storage option.", "error");
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Storage Options
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
            Configure dynamic storage mediums (Local Server Storage, AWS S3, Cloudflare R2, MinIO, Google Cloud).
            Click any storage provider card to view its detailed configuration, test credentials, activate primary target, or run migrations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMigrationOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Migrate Storage Data
          </button>
        </div>
      </div>

      {/* Active Driver Env Banner */}
      <div className="bg-zinc-900 dark:bg-zinc-950 text-zinc-100 p-4 rounded-xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs shadow-inner">
        <div>
          <div className="text-zinc-400 font-sans font-semibold mb-1 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Active Driver Configuration (.env)
          </div>
          <p className="font-sans text-zinc-400 text-[11px]">
            To force a specific active storage driver in production, set this environment variable:
          </p>
          <code className="text-emerald-400 mt-1 block font-mono text-xs">
            ACTIVE_STORAGE_DRIVER=local <span className="text-zinc-500"># or aws_s3, cloudflare_r2, minio, google_cloud</span>
          </code>
        </div>
      </div>

      {/* Storage Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {options.map((opt) => {
          const isLoading = loadingKey === opt.key;

          return (
            <Link
              key={opt.key}
              href={`/dashboard/storages/${opt.key}`}
              className={`group relative rounded-2xl border bg-white dark:bg-zinc-900 p-6 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                opt.is_active
                  ? "border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700"
              }`}
            >
              <div>
                {/* Header Status Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {opt.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {opt.driver}
                    </span>
                  </div>

                  {opt.is_active ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active Primary
                    </span>
                  ) : opt.is_env_complete ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                      ENV Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                      ENV Missing
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 line-clamp-2">
                  {opt.description}
                </p>

                {/* ENV Vars Checklist */}
                <div className="bg-zinc-50 dark:bg-zinc-950/60 rounded-xl p-3 border border-zinc-100 dark:border-zinc-800/80 mb-4 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Required ENV Variables (.env)
                  </div>
                  {opt.env_keys.map((envKey) => {
                    const isPresent = opt.env_status[envKey];
                    return (
                      <div key={envKey} className="flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-700 dark:text-zinc-300 text-[11px] truncate">
                          {envKey}
                        </span>
                        {isPresent ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                            ✓ Set
                          </span>
                        ) : (
                          <span className="text-red-500 dark:text-red-400 font-bold text-[10px]">
                            ✗ Missing
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action & Manage Link Row */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Manage Details &rarr;
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleVerify(opt.key, e)}
                    disabled={isLoading}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
                  >
                    {isLoading ? "..." : "Test"}
                  </button>

                  {opt.is_active ? (
                    <span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500">
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleActivate(opt.key, e)}
                      disabled={isLoading || !opt.is_env_complete}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 shadow-xs transition-colors"
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Migration Modal */}
      <MigrationModal
        isOpen={isMigrationOpen}
        onClose={() => setIsMigrationOpen(false)}
        options={options}
      />
    </div>
  );
}
