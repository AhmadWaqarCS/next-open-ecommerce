"use client";

import { useState, useTransition } from "react";
import { CRUD, theme, theme_component } from "@/lib/types";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import {
  toggleThemeStatusAction,
  deleteThemeAction,
  bulkUpdateThemesStatusAction,
  bulkDeleteThemesAction,
  toggleThemeComponentStatusAction,
  deleteThemeComponentAction,
} from "@/actions/theme-actions";
import ThemeModal from "./_components/theme-modal";
import ThemeComponentModal from "./_components/theme-component-modal";

interface ThemesTableProps {
  themes: theme[];
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount: number;
  currentPage?: number;
  pageSize?: number;
}

export default function ThemesTable({
  themes,
  permissions,
  userNames,
  totalCount,
  currentPage = 1,
  pageSize = 10,
}: ThemesTableProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Modals state
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<theme | null>(null);

  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<theme_component | null>(null);
  const [targetThemeId, setTargetThemeId] = useState<number | undefined>(undefined);

  // Expanded theme accordion state
  const [expandedThemeIds, setExpandedThemeIds] = useState<number[]>(themes.map((t) => t.id));

  const toggleExpand = (id: number) => {
    setExpandedThemeIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleToggleComponentStatus = (id: number, currentStatus: boolean) => {
    if (!permissions.update) {
      toast.error("You do not have permission to update components.");
      return;
    }
    startTransition(async () => {
      const res = await toggleThemeComponentStatusAction(id, !currentStatus);
      if (res.success) {
        toast.success(res.message || "Component status updated.");
      } else {
        toast.error(res.message || "Failed to update component status.");
      }
    });
  };

  const handleDeleteComponent = (id: number, name: string) => {
    if (!permissions.delete) {
      toast.error("You do not have permission to delete components.");
      return;
    }
    if (!confirm(`Are you sure you want to delete component '${name}'?`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteThemeComponentAction(id);
      if (res.success) {
        toast.success(res.message || "Component deleted.");
      } else {
        toast.error(res.message || "Failed to delete component.");
      }
    });
  };

  const columns: ColumnDef<theme>[] = [
    {
      header: "Theme & Folder",
      render: (t) => (
        <div className="flex items-start gap-3 py-1">
          <button
            type="button"
            onClick={() => toggleExpand(t.id)}
            className="p-1 rounded-lg text-dashboard-muted hover:text-dashboard-fg hover:bg-dashboard-card-hover transition mt-0.5"
            title="Expand / Collapse Components"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${
                expandedThemeIds.includes(t.id) ? "rotate-90 text-dashboard-fg" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-dashboard-fg text-sm">
                {t.name}
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-dashboard-muted-bg text-dashboard-muted border border-dashboard-border">
                Themes/{t.slug}/
              </span>
            </div>
            {t.description && (
              <p className="text-xs text-dashboard-muted mt-1 line-clamp-1">
                {t.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Components",
      render: (t) => (
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent/30">
            {t.components?.length || 0} Registered
          </span>
          {permissions.create && (
            <button
              type="button"
              onClick={() => {
                setSelectedComponent(null);
                setTargetThemeId(t.id);
                setIsComponentModalOpen(true);
              }}
              className="text-xs font-semibold text-dashboard-primary hover:text-dashboard-primary-hover hover:underline transition"
            >
              + Add Component
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <DataTable<theme>
        title="Themes & Component Registry"
        description="Developers create custom theme folders in Themes/ and register their components here for site-wide selection."
        permissions={permissions}
        data={themes}
        columns={columns}
        createButton={
          permissions.create ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedTheme(null);
                  setIsThemeModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Theme
              </button>
              {themes.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedComponent(null);
                    setTargetThemeId(themes[0]?.id);
                    setIsComponentModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl border border-dashboard-border bg-dashboard-card hover:bg-dashboard-card-hover text-dashboard-fg font-semibold text-xs transition flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Register Component
                </button>
              )}
            </div>
          ) : undefined
        }
        filterConfig={{
          searchKey: "name",
          searchPlaceholder: "Search themes by name or slug...",
          customFilters: [
            {
              key: "is_active",
              label: "Status",
              type: "select",
              isPrimary: true,
              options: [
                { label: "Active Themes Only", value: "true" },
                { label: "Inactive Themes Only", value: "false" },
              ],
            },
          ],
        }}
        paginationConfig={{
          totalItems: totalCount,
          currentPage,
          pageSize,
          itemName: "themes",
        }}
        statusConfig={{
          statusKey: "is_active",
          onToggleStatus: async (theme, newStatus) => {
            const res = await toggleThemeStatusAction(theme.id, newStatus);
            return res;
          },
        }}
        activityConfig={{ userNames }}
        actionConfig={{
          onEdit: permissions.update
            ? (t) => {
                setSelectedTheme(t);
                setIsThemeModalOpen(true);
              }
            : undefined,
          onDelete: permissions.delete
            ? async (t) => {
                const res = await deleteThemeAction(t.id);
                return res;
              }
            : undefined,
        }}
        bulkConfig={{
          onBulkSetStatus: permissions.update
            ? async (ids, is_active) => {
                const res = await bulkUpdateThemesStatusAction({ ids, is_active });
                return res;
              }
            : undefined,
          onBulkDelete: permissions.delete
            ? async (ids) => {
                const res = await bulkDeleteThemesAction({ ids });
                return res;
              }
            : undefined,
        }}
      />

      {/* Expanded Theme Components Section */}
      <div className="space-y-4">
        {themes.map((t) => {
          if (!expandedThemeIds.includes(t.id)) return null;
          const comps = t.components || [];

          return (
            <div
              key={t.id}
              className="rounded-2xl border border-dashboard-border bg-dashboard-card p-5 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-dashboard-border-subtle pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-dashboard-fg">
                    Components for {t.name}
                  </span>
                  <span className="text-xs font-mono text-dashboard-muted">
                    (Themes/{t.slug}/...)
                  </span>
                </div>
                {permissions.create && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedComponent(null);
                      setTargetThemeId(t.id);
                      setIsComponentModalOpen(true);
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg hover:bg-dashboard-card-hover transition"
                  >
                    + Register Component
                  </button>
                )}
              </div>

              {comps.length > 0 ? (
                <div className="divide-y divide-dashboard-border-subtle border border-dashboard-border rounded-xl overflow-hidden">
                  {comps.map((c) => {
                    const cfg = (c.theme_config ?? {}) as Record<string, any>;
                    return (
                      <div
                        key={c.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-dashboard-card hover:bg-dashboard-card-hover/40 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-semibold text-dashboard-fg">
                              {c.name}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent/20">
                              {c.component_type}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleComponentStatus(c.id, c.is_active)}
                              disabled={isPending || !permissions.update}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                                c.is_active
                                  ? "bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent/30"
                                  : "bg-dashboard-muted-bg text-dashboard-muted border border-dashboard-border"
                              }`}
                            >
                              {c.is_active ? "Active" : "Disabled"}
                            </button>
                          </div>
                          <p className="font-mono text-xs text-dashboard-muted">
                            Themes/{t.slug}/{c.file_path}
                          </p>
                          {/* Palette preview dots */}
                          {cfg.bg_color && (
                            <div className="flex items-center gap-2 pt-1 text-[11px] text-dashboard-muted">
                              <span>Palette:</span>
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-dashboard-border"
                                style={{ backgroundColor: cfg.bg_color }}
                                title={`Background: ${cfg.bg_color}`}
                              />
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-dashboard-border"
                                style={{ backgroundColor: cfg.accent_color || "#f59e0b" }}
                                title={`Accent: ${cfg.accent_color || "#f59e0b"}`}
                              />
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-dashboard-border"
                                style={{ backgroundColor: cfg.text_color || "#ffffff" }}
                                title={`Text: ${cfg.text_color || "#ffffff"}`}
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {permissions.update && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedComponent(c);
                                setTargetThemeId(t.id);
                                setIsComponentModalOpen(true);
                              }}
                              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-dashboard-border bg-dashboard-card text-dashboard-fg hover:bg-dashboard-card-hover transition"
                            >
                              Edit
                            </button>
                          )}
                          {permissions.delete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComponent(c.id, c.name)}
                              disabled={isPending}
                              className="p-1.5 text-dashboard-danger hover:bg-dashboard-danger-subtle rounded-xl transition"
                              title="Delete Component"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-dashboard-border rounded-xl">
                  <p className="text-xs text-dashboard-muted">
                    No components registered yet for this theme.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Theme Modal */}
      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        theme={selectedTheme}
      />

      {/* Theme Component Modal */}
      <ThemeComponentModal
        isOpen={isComponentModalOpen}
        onClose={() => setIsComponentModalOpen(false)}
        themes={themes}
        defaultThemeId={targetThemeId}
        component={selectedComponent}
      />
    </div>
  );
}
