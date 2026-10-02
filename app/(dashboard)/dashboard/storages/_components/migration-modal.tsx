"use client";

import { useState } from "react";
import Modal from "@/app/(dashboard)/_components/modal";
import { triggerStorageMigrationAction } from "@/actions/storage-actions";
import { StorageOptionDTO } from "@/services/storage-services";
import { useToast } from "@/app/(dashboard)/_components/toast-context";

interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: StorageOptionDTO[];
  onSuccess?: () => void;
}

export default function MigrationModal({
  isOpen,
  onClose,
  options,
  onSuccess,
}: MigrationModalProps) {
  const { toast } = useToast();
  const activeOption = options.find((o) => o.is_active);
  const [sourceKey, setSourceKey] = useState<string>(activeOption?.key || "local");
  const [targetKey, setTargetKey] = useState<string>("");
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleStartMigration = async () => {
    if (!sourceKey || !targetKey) {
      setMessage({ type: "error", text: "Please select both source and target storage options." });
      toast.error("Please select both source and target storage options.");
      return;
    }
    if (sourceKey === targetKey) {
      setMessage({ type: "error", text: "Source and target storage options must be different." });
      toast.error("Source and target storage options must be different.");
      return;
    }

    setIsMigrating(true);
    setMessage(null);

    try {
      const res = await triggerStorageMigrationAction(sourceKey, targetKey);
      if (res.success) {
        const successMsg = res.message || "Migration completed successfully!";
        setMessage({ type: "success", text: successMsg });
        toast.success(successMsg);
        if (onSuccess) onSuccess();
      } else {
        const errorMsg = res.message || "Migration failed.";
        setMessage({ type: "error", text: errorMsg });
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const errText = err?.message || "An unexpected migration error occurred.";
      setMessage({ type: "error", text: errText });
      toast.error(errText);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-dashboard-fg">
            Migrate Storage Medium
          </h3>
          <p className="text-xs text-dashboard-muted mt-1">
            Stream stored files from a source storage option to a verified target storage option and update referenced URLs.
          </p>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-medium border ${
              message.type === "success"
                ? "bg-dashboard-accent-subtle text-dashboard-accent-fg border-dashboard-accent/30"
                : "bg-dashboard-danger-subtle text-dashboard-danger border-dashboard-danger/30"
            }`}
          >
            {message.text}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-dashboard-fg mb-1">
            Source Storage (From)
          </label>
          <select
            value={sourceKey}
            onChange={(e) => setSourceKey(e.target.value)}
            disabled={isMigrating}
            className="w-full text-xs rounded-xl border border-dashboard-border bg-dashboard-muted-bg px-3 py-2 text-dashboard-fg focus:outline-hidden focus:ring-2 focus:ring-dashboard-primary"
          >
            {options.map((opt) => (
              <option key={opt.key} value={opt.key} disabled={!opt.is_env_complete}>
                {opt.name} ({opt.key}) {opt.is_active ? " — [Currently Active]" : ""} {opt.is_env_complete ? " ✓ [ENV Ready]" : " ✗ [ENV Missing]"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-dashboard-fg mb-1">
            Target Storage (To)
          </label>
          <select
            value={targetKey}
            onChange={(e) => setTargetKey(e.target.value)}
            disabled={isMigrating}
            className="w-full text-xs rounded-xl border border-dashboard-border bg-dashboard-muted-bg px-3 py-2 text-dashboard-fg focus:outline-hidden focus:ring-2 focus:ring-dashboard-primary"
          >
            <option value="">-- Select Target Storage Option --</option>
            {options
              .filter((o) => o.key !== sourceKey)
              .map((opt) => (
                <option key={opt.key} value={opt.key} disabled={!opt.is_env_complete}>
                  {opt.name} ({opt.key}) {opt.is_env_complete ? " ✓ [ENV Ready]" : " ✗ [ENV Missing]"}
                </option>
              ))}
          </select>
        </div>

        <div className="pt-3 flex justify-end gap-3 border-t border-dashboard-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isMigrating}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-dashboard-muted hover:text-dashboard-fg hover:bg-dashboard-card-hover transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStartMigration}
            disabled={isMigrating || !targetKey}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg shadow-xs disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
          >
            {isMigrating && (
              <svg className="animate-spin h-3.5 w-3.5 text-dashboard-primary-fg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {isMigrating ? "Migrating Files..." : "Start Migration"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
