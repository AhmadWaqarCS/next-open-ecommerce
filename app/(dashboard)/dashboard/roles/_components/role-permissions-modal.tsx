"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { CRUD, roleWithPermissions, siteFeature } from "@/lib/types";
import { updateRolePermissions } from "@/actions/role-actions";

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: roleWithPermissions | null;
  siteFeatures: siteFeature[];
}

type PermissionState = Record<
  number,
  { create: boolean; read: boolean; update: boolean; delete: boolean }
>;

export default function RolePermissionsModal({
  isOpen,
  onClose,
  role,
  siteFeatures,
}: RolePermissionsModalProps) {
  const [permissionState, setPermissionState] = useState<PermissionState>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && role) {
      setGlobalError(null);
      setSearchQuery("");
      const initial: PermissionState = {};
      siteFeatures.forEach((f) => {
        const existing = role.site_feature_roles.find(
          (sfr) => sfr.site_feature_id === f.id,
        );
        initial[f.id] = existing?.access_crud ?? {
          create: false,
          read: false,
          update: false,
          delete: false,
        };
      });
      setPermissionState(initial);
    }
  }, [isOpen, role, siteFeatures]);

  const toggleCrud = (
    featureId: number,
    key: keyof CRUD,
    value: boolean,
  ) => {
    setPermissionState((prev) => ({
      ...prev,
      [featureId]: {
        ...(prev[featureId] ?? {
          create: false,
          read: false,
          update: false,
          delete: false,
        }),
        [key]: value,
      },
    }));
  };

  const handleSetAllForFeature = (featureId: number, value: boolean) => {
    setPermissionState((prev) => ({
      ...prev,
      [featureId]: {
        create: value,
        read: value,
        update: value,
        delete: value,
      },
    }));
  };

  const handleBulkSetAllRead = () => {
    setPermissionState((prev) => {
      const next = { ...prev };
      siteFeatures.forEach((f) => {
        next[f.id] = {
          ...(next[f.id] ?? {
            create: false,
            read: false,
            update: false,
            delete: false,
          }),
          read: true,
        };
      });
      return next;
    });
  };

  const handleBulkSetAllCrud = () => {
    setPermissionState((prev) => {
      const next = { ...prev };
      siteFeatures.forEach((f) => {
        next[f.id] = {
          create: true,
          read: true,
          update: true,
          delete: true,
        };
      });
      return next;
    });
  };

  const handleBulkClearAll = () => {
    setPermissionState((prev) => {
      const next = { ...prev };
      siteFeatures.forEach((f) => {
        next[f.id] = {
          create: false,
          read: false,
          update: false,
          delete: false,
        };
      });
      return next;
    });
  };

  const filteredFeatures = useMemo(() => {
    if (!searchQuery.trim()) return siteFeatures;
    const q = searchQuery.toLowerCase().trim();
    return siteFeatures.filter(
      (f) =>
        f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q),
    );
  }, [siteFeatures, searchQuery]);

  const handleSave = () => {
    if (!role) return;
    setGlobalError(null);

    startTransition(async () => {
      const permsArray = Object.entries(permissionState).map(
        ([feature_id, crud]) => ({
          site_feature_id: Number(feature_id),
          access_crud: crud,
        }),
      );

      const response = await updateRolePermissions(role.id, permsArray);
      if (!response.success) {
        if (response.message) setGlobalError(response.message);
        toast.error(response.message ?? "Failed to update permissions.");
        return;
      }

      onClose();
      toast.success(
        response.message ?? `Permissions for "${role.name}" updated successfully.`,
      );
    });
  };

  if (!role) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl">
      <div className="space-y-4">
        {/* Top Header Section with Title & Top-Right Action Button */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-dashboard-border">
          <div>
            <h3 className="text-lg font-bold text-dashboard-fg">
              Feature Permissions: {role.name}
            </h3>
            <p className="text-xs text-dashboard-muted mt-0.5">
              Configure granular CRUD access rights across administrative site features.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-dashboard-border hover:bg-dashboard-card-hover text-dashboard-fg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isPending ? "Saving..." : "Save Permissions"}
            </button>
          </div>
        </div>

        {globalError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-dashboard-danger-subtle border border-dashboard-danger text-dashboard-danger text-xs font-medium"
          >
            {globalError}
          </div>
        )}

        {/* Toolbar: Feature Search & Quick Bulk Toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-2">
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 pl-8 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder:text-dashboard-muted focus:border-dashboard-primary focus:outline-none text-xs transition-colors"
            />
            <svg
              className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-dashboard-muted pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleBulkSetAllRead}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-dashboard-border bg-dashboard-card hover:bg-dashboard-card-hover text-dashboard-fg transition-colors cursor-pointer"
            >
              Select All Read
            </button>
            <button
              type="button"
              onClick={handleBulkSetAllCrud}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-dashboard-accent-subtle bg-dashboard-accent-subtle text-dashboard-accent-fg hover:opacity-90 transition-opacity cursor-pointer"
            >
              Select All CRUD
            </button>
            <button
              type="button"
              onClick={handleBulkClearAll}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-dashboard-border hover:bg-dashboard-card-hover text-dashboard-muted hover:text-dashboard-fg transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="max-h-[55vh] overflow-y-auto border border-dashboard-border rounded-xl">
          <div className="sticky top-0 z-10 bg-dashboard-table-header border-b border-dashboard-border text-xs font-bold text-dashboard-muted uppercase tracking-wider grid grid-cols-12 py-2 px-3">
            <div className="col-span-6 sm:col-span-5">Feature & Path</div>
            <div className="col-span-1 text-center">Create</div>
            <div className="col-span-1 text-center">Read</div>
            <div className="col-span-1 text-center">Update</div>
            <div className="col-span-1 text-center">Delete</div>
            <div className="col-span-2 sm:col-span-3 text-right">Row Actions</div>
          </div>

          <div className="divide-y divide-dashboard-border-subtle">
            {filteredFeatures.length === 0 ? (
              <div className="py-8 text-center text-xs text-dashboard-muted">
                No matching site features found.
              </div>
            ) : (
              filteredFeatures.map((feat, idx) => {
                const currentCrud = permissionState[feat.id] ?? {
                  create: false,
                  read: false,
                  update: false,
                  delete: false,
                };
                const allSelected =
                  currentCrud.create &&
                  currentCrud.read &&
                  currentCrud.update &&
                  currentCrud.delete;

                return (
                  <div
                    key={feat.id}
                    className={`grid grid-cols-12 items-center py-2.5 px-3 text-sm transition-colors hover:bg-dashboard-table-hover ${
                      idx % 2 === 0 ? "bg-dashboard-table-even" : "bg-dashboard-table-odd"
                    }`}
                  >
                    <div className="col-span-6 sm:col-span-5 pr-2">
                      <div className="font-semibold text-dashboard-fg text-xs">
                        {feat.name}
                      </div>
                      <div className="text-[10px] text-dashboard-muted font-mono truncate">
                        {feat.path}
                      </div>
                    </div>

                    {(["create", "read", "update", "delete"] as const).map(
                      (key) => (
                        <div key={key} className="col-span-1 flex justify-center">
                          <input
                            type="checkbox"
                            checked={currentCrud[key]}
                            onChange={(e) =>
                              toggleCrud(feat.id, key, e.target.checked)
                            }
                            className="h-4 w-4 rounded border-dashboard-border text-dashboard-primary focus:ring-dashboard-primary/20 cursor-pointer"
                          />
                        </div>
                      ),
                    )}

                    <div className="col-span-2 sm:col-span-3 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleSetAllForFeature(feat.id, !allSelected)
                        }
                        className="px-2 py-0.5 text-[10px] font-semibold rounded border border-dashboard-border hover:bg-dashboard-card-hover text-dashboard-muted hover:text-dashboard-fg transition-colors cursor-pointer"
                      >
                        {allSelected ? "Uncheck" : "All"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
