"use client";

import { useState } from "react";
import Modal from "@/app/(dashboard)/_components/modal";
import { triggerStorageMigrationAction } from "@/actions/storage-actions";
import { StorageOptionDTO } from "@/services/storage-services";

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
  const activeOption = options.find((o) => o.is_active);
  const [sourceKey, setSourceKey] = useState<string>(activeOption?.key || "local");
  const [targetKey, setTargetKey] = useState<string>("");
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleStartMigration = async () => {
    if (!sourceKey || !targetKey) {
      setMessage({ type: "error", text: "Please select both source and target storage options." });
      return;
    }
    if (sourceKey === targetKey) {
      setMessage({ type: "error", text: "Source and target storage options must be different." });
      return;
    }

    setIsMigrating(true);
    setMessage(null);

    try {
      const res = await triggerStorageMigrationAction(sourceKey, targetKey);
      if (res.success) {
        setMessage({ type: "success", text: res.message || "Migration complete!" });
        if (onSuccess) onSuccess();
      } else {
        setMessage({ type: "error", text: res.message || "Migration failed." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "An unexpected error occurred." });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          Migrate Storage Medium
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Stream files from a source storage medium to a target storage medium and automatically update database media references.
        </p>

        {message && (
          <div
            className={`p-3 rounded-lg text-xs font-medium ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900"
            }`}
          >
            {message.text}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Source Storage (From)
          </label>
          <select
            value={sourceKey}
            onChange={(e) => setSourceKey(e.target.value)}
            disabled={isMigrating}
            className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            {options.map((opt) => (
              <option key={opt.key} value={opt.key} disabled={!opt.is_env_complete}>
                {opt.name} ({opt.key}) {opt.is_active ? " - Currently Active" : ""} {opt.is_env_complete ? " ✓ [ENV Ready]" : " ✗ [ENV Missing]"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Target Storage (To)
          </label>
          <select
            value={targetKey}
            onChange={(e) => setTargetKey(e.target.value)}
            disabled={isMigrating}
            className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Select Target Storage --</option>
            {options
              .filter((o) => o.key !== sourceKey)
              .map((opt) => (
                <option key={opt.key} value={opt.key} disabled={!opt.is_env_complete}>
                  {opt.name} ({opt.key}) {opt.is_env_complete ? " ✓ [ENV Ready]" : " ✗ [ENV Missing]"}
                </option>
              ))}
          </select>
        </div>

        <div className="pt-2 flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isMigrating}
            className="px-4 py-2 text-xs font-semibold rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStartMigration}
            disabled={isMigrating || !targetKey}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isMigrating && (
              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            {isMigrating ? "Migrating Files..." : "Start Migration"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
