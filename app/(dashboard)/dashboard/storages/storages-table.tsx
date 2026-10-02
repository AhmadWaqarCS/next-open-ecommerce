"use client";

import { useState } from "react";
import Link from "next/link";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { StorageOptionDTO } from "@/services/storage-services";
import { activateStorageAction, verifyStorageEnvAction } from "@/actions/storage-actions";
import { CRUD } from "@/lib/types";
import MigrationModal from "./_components/migration-modal";

interface StoragesTableProps {
  options: StorageOptionDTO[];
  permissions: CRUD;
  activeDriverEnv?: string | null;
}

export default function StoragesTable({
  options: initialOptions,
  permissions,
  activeDriverEnv,
}: StoragesTableProps) {
  const { toast } = useToast();
  const [options, setOptions] = useState<StorageOptionDTO[]>(initialOptions);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [isMigrationOpen, setIsMigrationOpen] = useState(false);

  const handleVerify = async (key: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setLoadingKey(key);
    try {
      const res = await verifyStorageEnvAction(key);
      if (res.success) {
        toast.success(res.message || "Storage verified successfully!");
      } else {
        toast.error(res.message || "Verification test failed. Check server .env settings.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Storage verification request failed.");
    } finally {
      setLoadingKey(null);
    }
  };

  const handleActivate = async (key: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setLoadingKey(key);
    try {
      const res = await activateStorageAction(key);
      if (res.success) {
        toast.success(res.message || "Storage option activated!");
        setOptions((prev) =>
          prev.map((opt) => ({
            ...opt,
            is_active: opt.key === key,
          }))
        );
      } else {
        toast.error(res.message || "Failed to activate storage option.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Activation request failed.");
    } finally {
      setLoadingKey(null);
    }
  };

  const columns: ColumnDef<StorageOptionDTO>[] = [
    {
      header: "Provider & Key",
      render: (opt) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-dashboard-fg">{opt.name}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-dashboard-muted-bg text-dashboard-muted border border-dashboard-border">
              {opt.key}
            </span>
          </div>
          <span className="text-[11px] font-mono text-dashboard-muted">
            driver: <span className="font-semibold text-dashboard-fg uppercase">{opt.driver}</span>
          </span>
        </div>
      ),
    },
    {
      header: "Description",
      render: (opt) => (
        <span className="text-xs text-dashboard-muted line-clamp-2 max-w-sm">
          {opt.description || "No description provided."}
        </span>
      ),
    },
    {
      header: "ENV Configuration",
      render: (opt) => {
        const requiredCount = opt.env_keys.length;
        const configuredCount = opt.env_keys.filter((k) => opt.env_status[k]).length;

        if (opt.is_env_complete) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent/30">
              <span className="h-1.5 w-1.5 rounded-full bg-dashboard-accent" />
              {requiredCount > 0 ? `${configuredCount}/${requiredCount} Ready` : "Ready (Local)"}
            </span>
          );
        }

        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {`${requiredCount - configuredCount} Missing`}
          </span>
        );
      },
    },
    {
      header: "Files & Storage",
      render: (opt) => (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-dashboard-fg">
            {opt.metrics?.formattedTotalSize || "0 Bytes"}
          </span>
          <span className="text-[11px] text-dashboard-muted">
            {opt.metrics?.totalFilesCount?.toLocaleString() || 0} files stored
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      render: (opt) => {
        const isLoading = loadingKey === opt.key;

        if (opt.is_active) {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent/40 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-dashboard-accent animate-pulse" />
              Active Primary
            </span>
          );
        }

        return (
          <button
            type="button"
            onClick={(e) => handleActivate(opt.key, e)}
            disabled={isLoading || !opt.is_env_complete || !permissions.update}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg disabled:opacity-40 shadow-xs transition-colors cursor-pointer"
            title={!opt.is_env_complete ? "Configure missing .env keys first" : "Activate as primary write target"}
          >
            {isLoading ? "Activating..." : "Activate"}
          </button>
        );
      },
    },
    {
      header: "Actions",
      className: "text-right",
      render: (opt) => {
        const isLoading = loadingKey === opt.key;

        return (
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => handleVerify(opt.key, e)}
              disabled={isLoading}
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-dashboard-border bg-dashboard-card hover:bg-dashboard-card-hover text-dashboard-fg disabled:opacity-40 transition-colors cursor-pointer"
            >
              {isLoading ? "Testing..." : "Test Connection"}
            </button>

            <Link
              href={`/dashboard/storages/${opt.key}`}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg text-dashboard-primary hover:text-dashboard-primary-hover hover:bg-dashboard-muted-bg transition-colors"
            >
              Details &rarr;
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Active Driver Environment Override Banner */}
      {activeDriverEnv && (
        <div className="p-4 rounded-2xl bg-dashboard-card border border-dashboard-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-semibold text-dashboard-fg">
              Active Storage Driver Enforced via Environment Variable (.env)
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] bg-dashboard-muted-bg px-3 py-1 rounded-lg border border-dashboard-border text-dashboard-fg">
            <span>ACTIVE_STORAGE_DRIVER=</span>
            <span className="font-bold text-dashboard-accent-fg">{activeDriverEnv}</span>
          </div>
        </div>
      )}

      {/* Global Data Table */}
      <DataTable<StorageOptionDTO>
        title="Storage Options"
        description="Manage system storage mediums and migration configurations. Only one storage option can be active at a time for incoming media uploads."
        permissions={permissions}
        data={options}
        columns={columns}
        getRowHref={(opt) => `/dashboard/storages/${opt.key}`}
        createButton={
          <button
            type="button"
            onClick={() => setIsMigrationOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            Migrate Storage Data
          </button>
        }
        filterConfig={{
          searchKey: "name",
          searchPlaceholder: "Search storage options...",
          customFilters: [
            {
              key: "driver",
              label: "Driver Type",
              type: "select",
              isPrimary: true,
              options: [
                { label: "Local Filesystem (fs)", value: "fs" },
                { label: "S3 Compatible (s3)", value: "s3" },
                { label: "Google Cloud (gcs)", value: "gcs" },
              ],
            },
            {
              key: "is_active",
              label: "Write Target Status",
              type: "select",
              isPrimary: true,
              options: [
                { label: "Active Primary Target", value: "true" },
                { label: "Inactive Targets", value: "false" },
              ],
            },
          ],
        }}
        paginationConfig={{
          totalItems: options.length,
          itemName: "storage options",
          pageSize: 10,
        }}
        emptyState={{
          title: "No storage options configured",
          description: "Storage options are seeded into the system automatically.",
        }}
      />

      {/* Migration Modal */}
      <MigrationModal
        isOpen={isMigrationOpen}
        onClose={() => setIsMigrationOpen(false)}
        options={options}
      />
    </div>
  );
}
