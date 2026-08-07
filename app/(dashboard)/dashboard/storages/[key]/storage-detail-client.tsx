"use client";

import { useState } from "react";
import Link from "next/link";
import { StorageOptionDTO, StorageMetricsDTO } from "@/services/storage-services";
import { activateStorageAction, verifyStorageEnvAction, triggerStorageMigrationAction } from "@/actions/storage-actions";
import { useToast } from "@/app/(dashboard)/_components/toast-context";

interface StorageDetailClientProps {
  option: StorageOptionDTO;
  allOptions: StorageOptionDTO[];
  metrics: StorageMetricsDTO;
}

function getEnvSnippet(key: string): string {
  switch (key) {
    case "local":
      return `# Local Server Storage Configuration\nLOCAL_UPLOADS_DIR=uploads`;
    case "aws_s3":
      return `# AWS S3 Storage Configuration\nAWS_S3_KEY=your_access_key_id\nAWS_S3_SECRET=your_secret_access_key\nAWS_S3_BUCKET=your_s3_bucket_name\nAWS_S3_REGION=us-east-1`;
    case "cloudflare_r2":
      return `# Cloudflare R2 Storage Configuration\nCLOUDFLARE_R2_KEY=your_r2_access_key_id\nCLOUDFLARE_R2_SECRET=your_r2_secret_access_key\nCLOUDFLARE_R2_BUCKET=your_r2_bucket_name\nCLOUDFLARE_R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com`;
    case "minio":
      return `# MinIO Object Storage Configuration\nMINIO_KEY=your_minio_access_key\nMINIO_SECRET=your_minio_secret_key\nMINIO_BUCKET=your_minio_bucket_name\nMINIO_ENDPOINT=http://127.0.0.1:9000`;
    case "google_cloud":
      return `# Google Cloud Storage Configuration\nGCS_KEY_FILE=/path/to/gcs-service-account-key.json\nGCS_BUCKET=your_gcs_bucket_name`;
    default:
      return "";
  }
}

export default function StorageDetailClient({
  option: initialOption,
  allOptions,
  metrics: initialMetrics,
}: StorageDetailClientProps) {
  const { toast } = useToast();
  const [option, setOption] = useState<StorageOptionDTO>(initialOption);
  const [metrics] = useState<StorageMetricsDTO>(initialMetrics);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [migrationTargetKey, setMigrationTargetKey] = useState("");
  const [migrationSourceKey, setMigrationSourceKey] = useState("");
  const [isMigrating, setIsMigrating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [migrationLog, setMigrationLog] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await verifyStorageEnvAction(option.key);
      if (res.valid) {
        toast("Environment variables & storage connection verified successfully!", "success");
        setOption((prev) => ({
          ...prev,
          env_status: res.envStatus ? Object.fromEntries(Object.entries(res.envStatus).map(([k, v]) => [k, v.present])) : prev.env_status,
          is_env_complete: true,
        }));
      } else {
        toast(res.error || "Verification failed. Check your .env file.", "error");
      }
    } catch (err: any) {
      toast(err?.message || "Verification test failed.", "error");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      const res = await activateStorageAction(option.key);
      if (res.success) {
        toast(res.message || "Storage activated as primary write target!", "success");
        setOption((prev) => ({ ...prev, is_active: true }));
      } else {
        toast(res.message || "Failed to activate storage option.", "error");
      }
    } catch (err: any) {
      toast(err?.message || "Activation failed.", "error");
    } finally {
      setIsActivating(false);
    }
  };

  const handleCopyEnv = () => {
    const snippet = getEnvSnippet(option.key);
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast("Environment variables snippet copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMigrateFromThis = async () => {
    if (!migrationTargetKey) {
      toast("Please select a target storage option.", "error");
      return;
    }
    setIsMigrating(true);
    setMigrationLog(null);

    try {
      const res = await triggerStorageMigrationAction(option.key, migrationTargetKey);
      if (res.success) {
        setMigrationLog({ type: "success", text: res.message || "Migration completed successfully!" });
        toast("Migration finished successfully!", "success");
      } else {
        setMigrationLog({ type: "error", text: res.message || "Migration failed." });
        toast(res.message || "Migration failed.", "error");
      }
    } catch (err: any) {
      setMigrationLog({ type: "error", text: err?.message || "An unexpected error occurred." });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleMigrateToThis = async () => {
    if (!migrationSourceKey) {
      toast("Please select a source storage option.", "error");
      return;
    }
    setIsMigrating(true);
    setMigrationLog(null);

    try {
      const res = await triggerStorageMigrationAction(migrationSourceKey, option.key);
      if (res.success) {
        setMigrationLog({ type: "success", text: res.message || "Migration completed successfully!" });
        toast("Migration finished successfully!", "success");
      } else {
        setMigrationLog({ type: "error", text: res.message || "Migration failed." });
        toast(res.message || "Migration failed.", "error");
      }
    } catch (err: any) {
      setMigrationLog({ type: "error", text: err?.message || "An unexpected error occurred." });
    } finally {
      setIsMigrating(false);
    }
  };

  const envSnippet = getEnvSnippet(option.key);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/dashboard/storages" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          Storage Options
        </Link>
        <span>/</span>
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{option.name}</span>
      </div>

      {/* Main Storage Banner */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              {option.name}
            </h1>
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
              driver: {option.driver}
            </span>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl">
            {option.description}
          </p>

          <div className="flex items-center gap-2 pt-1">
            {option.is_active ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Primary Storage Target
              </span>
            ) : option.is_env_complete ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                ✓ ENV Configured & Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                ⚠ ENV Missing
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleVerify}
            disabled={isVerifying}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors flex items-center gap-2 cursor-pointer"
          >
            {isVerifying && (
              <svg className="animate-spin h-3.5 w-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {isVerifying ? "Verifying..." : "Test Connection & ENV"}
          </button>

          {option.is_active ? (
            <span className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
              Active Storage Target
            </span>
          ) : (
            <button
              type="button"
              onClick={handleActivate}
              disabled={isActivating || !option.is_env_complete}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              {isActivating && (
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {isActivating ? "Activating..." : "Set as Active Storage"}
            </button>
          )}
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Total Files Stored</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
            {metrics.totalFilesCount.toLocaleString()}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">Files present in this storage medium</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Total Size Used</p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {metrics.formattedTotalSize}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">({metrics.totalSizeBytes.toLocaleString()} bytes)</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Driver Abstraction</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1 uppercase font-mono">
            {option.driver}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">Flydrive unified driver API</p>
        </div>
      </div>

      {/* ENV Requirements Section (Styled identical to Email Config) */}
      <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Environment Variables Configuration (.env)
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              All credentials, API keys, endpoints, and bucket names are loaded securely from server environment variables (<code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">.env</code>).
            </p>
          </div>

          <button
            type="button"
            onClick={handleVerify}
            disabled={isVerifying}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-900/40 rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isVerifying ? (
              <>
                <svg className="animate-spin h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Testing Connection...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Verify Storage Connection
              </>
            )}
          </button>
        </div>

        {/* Security & Privacy Protocol Information Card */}
        <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
          <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
            <p className="font-semibold">Security & Privacy Protocol</p>
            <p className="text-indigo-700 dark:text-indigo-300">
              API secrets, secret access keys, and passwords are never exposed on the client side or stored in the database. Add the environment variables below to your server&apos;s <code className="font-mono bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.5 rounded">.env</code> file, then click <strong>Verify Storage Connection</strong> to test the server setup.
            </p>
          </div>
        </div>

        {/* Code Snippet Box */}
        <div className="relative rounded-xl bg-zinc-950 border border-zinc-800 p-4 font-mono text-xs text-zinc-100 overflow-x-auto shadow-inner">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 text-zinc-400 font-sans">
            <span className="flex items-center gap-2 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Required .env Configuration ({option.name})
            </span>
            <button
              type="button"
              onClick={handleCopyEnv}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all text-xs cursor-pointer font-mono"
            >
              {copied ? (
                <>
                  <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Snippet
                </>
              )}
            </button>
          </div>
          <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed">
            {envSnippet}
          </pre>
        </div>

        {/* Individual Environment Checklist */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
          {option.env_keys.map((envKey) => {
            const isPresent = option.env_status[envKey];
            return (
              <div key={envKey} className="p-4 flex items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-950/40">
                <div className="space-y-0.5">
                  <p className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">{envKey}</p>
                  <p className="text-[11px] text-zinc-400">
                    Required environment variable for {option.name}
                  </p>
                </div>
                <div>
                  {isPresent ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                      ✓ Configured in .env
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900">
                      ✗ Missing from .env
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Migration Actions Section (Guarded by ENV completeness) */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            Protected Storage Data Migration
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Migrate media files from or to <strong>{option.name}</strong>. Both source and target storage options must pass environment & accessibility verification.
          </p>
        </div>

        {migrationLog && (
          <div
            className={`p-3 rounded-lg text-xs font-medium ${
              migrationLog.type === "success"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900"
            }`}
          >
            {migrationLog.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Migrate FROM this storage */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-3">
            <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              Migrate Data FROM {option.name}
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Copy all files stored in {option.name} to another verified target storage option.
            </p>
            <div className="flex gap-2">
              <select
                value={migrationTargetKey}
                onChange={(e) => setMigrationTargetKey(e.target.value)}
                disabled={isMigrating || !option.is_env_complete}
                className="flex-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
              >
                <option value="">-- Select Target Storage --</option>
                {allOptions
                  .filter((o) => o.key !== option.key)
                  .map((o) => (
                    <option key={o.key} value={o.key} disabled={!o.is_env_complete}>
                      {o.name} ({o.key}) {o.is_env_complete ? " ✓ [ENV Ready]" : " ✗ [ENV Missing]"}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleMigrateFromThis}
                disabled={isMigrating || !migrationTargetKey || !option.is_env_complete}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors cursor-pointer"
              >
                Migrate Out
              </button>
            </div>
          </div>

          {/* Migrate TO this storage */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-3">
            <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              Migrate Data TO {option.name}
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Copy all files from a verified source storage option into {option.name}.
            </p>
            <div className="flex gap-2">
              <select
                value={migrationSourceKey}
                onChange={(e) => setMigrationSourceKey(e.target.value)}
                disabled={isMigrating || !option.is_env_complete}
                className="flex-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
              >
                <option value="">-- Select Source Storage --</option>
                {allOptions
                  .filter((o) => o.key !== option.key)
                  .map((o) => (
                    <option key={o.key} value={o.key} disabled={!o.is_env_complete}>
                      {o.name} ({o.key}) {o.is_env_complete ? " ✓ [ENV Ready]" : " ✗ [ENV Missing]"}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleMigrateToThis}
                disabled={isMigrating || !migrationSourceKey || !option.is_env_complete}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors cursor-pointer"
              >
                Migrate In
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
