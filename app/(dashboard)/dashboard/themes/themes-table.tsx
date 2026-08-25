"use client";

import { useState, useTransition } from "react";
import { CRUD, theme, theme_component } from "@/lib/types";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import {
  toggleThemeStatus,
  deleteTheme,
  toggleThemeComponentStatus,
  deleteThemeComponent,
} from "@/actions/theme-actions";
import ThemeModal from "./theme-modal";
import ThemeComponentModal from "./theme-component-modal";

interface ThemesTableProps {
  themes: theme[];
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount: number;
}

export default function ThemesTable({
  themes,
  permissions,
  userNames,
  totalCount,
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

  const handleToggleThemeStatus = (id: number, currentStatus: boolean) => {
    if (!permissions.update) {
      toast("You do not have permission to update themes.", "error");
      return;
    }
    startTransition(async () => {
      const res = await toggleThemeStatus(id, !currentStatus);
      if (res.success) toast(res.message || "Theme status updated.", "success");
      else toast(res.message || "Failed to update theme status.", "error");
    });
  };

  const handleDeleteTheme = (id: number, name: string) => {
    if (!permissions.delete) {
      toast("You do not have permission to delete themes.", "error");
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete theme '${name}' and all its registered components?`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteTheme(id);
      if (res.success) toast(res.message || "Theme deleted.", "success");
      else toast(res.message || "Failed to delete theme.", "error");
    });
  };

  const handleToggleComponentStatus = (id: number, currentStatus: boolean) => {
    if (!permissions.update) {
      toast("You do not have permission to update components.", "error");
      return;
    }
    startTransition(async () => {
      const res = await toggleThemeComponentStatus(id, !currentStatus);
      if (res.success) toast(res.message || "Component status updated.", "success");
      else toast(res.message || "Failed to update component status.", "error");
    });
  };

  const handleDeleteComponent = (id: number, name: string) => {
    if (!permissions.delete) {
      toast("You do not have permission to delete components.", "error");
      return;
    }
    if (!confirm(`Are you sure you want to delete component '${name}'?`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteThemeComponent(id);
      if (res.success) toast(res.message || "Component deleted.", "success");
      else toast(res.message || "Failed to delete component.", "error");
    });
  };

  const columns: ColumnDef<theme>[] = [
    {
      header: "Theme",
      render: (t) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleExpand(t.id)}
            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="Expand / Collapse Components"
          >
            <svg
              className={`w-4 h-4 text-zinc-500 transition-transform ${
                expandedThemeIds.includes(t.id) ? "rotate-90" : ""
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
              <span className="font-bold text-zinc-900 dark:text-zinc-50 text-sm">
                {t.name}
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                Themes/{t.slug}/
              </span>
            </div>
            {t.description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
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
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {t.components?.length || 0} Registered
          </span>
          {permissions.create && (
            <button
              onClick={() => {
                setSelectedComponent(null);
                setTargetThemeId(t.id);
                setIsComponentModalOpen(true);
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline"
            >
              + Add Component
            </button>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      render: (t) => (
        <button
          onClick={() => handleToggleThemeStatus(t.id, t.is_active)}
          disabled={isPending || !permissions.update}
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold transition ${
            t.is_active
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${t.is_active ? "bg-emerald-500" : "bg-zinc-400"}`} />
          {t.is_active ? "Active" : "Inactive"}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        title="Themes & Component Registry"
        description="Developers create custom theme folders in Themes/ and register their components here for site-wide selection."
        permissions={permissions}
        data={themes}
        totalCount={totalCount}
        columns={columns}
        createButton={
          permissions.create ? (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedTheme(null);
                  setIsThemeModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Theme
              </button>
              {themes.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedComponent(null);
                    setTargetThemeId(themes[0]?.id);
                    setIsComponentModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold text-xs transition flex items-center gap-2"
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
        renderActions={(t) => (
          <div className="flex items-center gap-2">
            {permissions.update && (
              <button
                onClick={() => {
                  setSelectedTheme(t);
                  setIsThemeModalOpen(true);
                }}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                title="Edit Theme"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {permissions.delete && (
              <button
                onClick={() => handleDeleteTheme(t.id, t.name)}
                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                title="Delete Theme"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      />

      {/* Expanded Theme Components Section */}
      <div className="space-y-4">
        {themes.map((t) => {
          if (!expandedThemeIds.includes(t.id)) return null;
          const comps = t.components || [];

          return (
            <div
              key={t.id}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Components for {t.name}
                  </span>
                  <span className="text-xs text-zinc-500">
                    (Themes/{t.slug}/...)
                  </span>
                </div>
                {permissions.create && (
                  <button
                    onClick={() => {
                      setSelectedComponent(null);
                      setTargetThemeId(t.id);
                      setIsComponentModalOpen(true);
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition"
                  >
                    + Register Component
                  </button>
                )}
              </div>

              {comps.length > 0 ? (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                  {comps.map((c) => {
                    const cfg = (c.theme_config ?? {}) as Record<string, any>;
                    return (
                      <div
                        key={c.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-zinc-50/40 dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              {c.name}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900">
                              {c.component_type}
                            </span>
                            <button
                              onClick={() => handleToggleComponentStatus(c.id, c.is_active)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                c.is_active
                                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700"
                              }`}
                            >
                              {c.is_active ? "Active" : "Disabled"}
                            </button>
                          </div>
                          <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                            Themes/{t.slug}/{c.file_path}
                          </p>
                          {/* Palette preview */}
                          {cfg.bg_color && (
                            <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-500">
                              <span>Palette:</span>
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/20"
                                style={{ backgroundColor: cfg.bg_color }}
                                title={`Background: ${cfg.bg_color}`}
                              />
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/20"
                                style={{ backgroundColor: cfg.accent_color || "#f59e0b" }}
                                title={`Accent: ${cfg.accent_color || "#f59e0b"}`}
                              />
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/20"
                                style={{ backgroundColor: cfg.text_color || "#ffffff" }}
                                title={`Text: ${cfg.text_color || "#ffffff"}`}
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {permissions.update && (
                            <button
                              onClick={() => {
                                setSelectedComponent(c);
                                setTargetThemeId(t.id);
                                setIsComponentModalOpen(true);
                              }}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                            >
                              Edit
                            </button>
                          )}
                          {permissions.delete && (
                            <button
                              onClick={() => handleDeleteComponent(c.id, c.name)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
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
                <div className="text-center py-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <p className="text-xs text-zinc-500">
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
