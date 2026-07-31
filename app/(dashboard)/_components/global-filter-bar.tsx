"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect } from "react";

export type FilterFieldType = "select" | "text" | "number" | "date";

export interface FilterOption {
  label: string;
  value: string;
}

export interface CustomFilterConfig {
  key: string;
  label: string;
  type?: FilterFieldType;
  placeholder?: string;
  options?: FilterOption[];
  isPrimary?: boolean;
}

export interface GlobalFilterBarProps {
  searchKey?: string;
  searchPlaceholder?: string;
  users?: { id: number; name: string | null; email: string }[];
  currentFilters?: Record<string, string | undefined>;
  customFilters?: CustomFilterConfig[];
  hideAuditFilters?: boolean;
  hideIdFilter?: boolean;
}

export default function GlobalFilterBar({
  searchKey = "name",
  searchPlaceholder = "Search...",
  users = [],
  currentFilters = {},
  customFilters = [],
  hideAuditFilters = false,
  hideIdFilter = false,
}: GlobalFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Local state for text / number inputs to avoid immediate re-renders on every keypress
  const [searchInput, setSearchInput] = useState(currentFilters[searchKey] ?? "");
  const [idInput, setIdInput] = useState(currentFilters.id ?? "");
  const [customTextInputs, setCustomTextInputs] = useState<Record<string, string>>({});

  const customFilterKeysStr = customFilters.map((cf) => `${cf.key}:${cf.type}`).join(",");
  const currentFiltersStr = JSON.stringify(currentFilters);

  useEffect(() => {
    setSearchInput(currentFilters[searchKey] ?? "");
    setIdInput(currentFilters.id ?? "");

    setCustomTextInputs((prev) => {
      let changed = false;
      const next: Record<string, string> = {};
      customFilters.forEach((cf) => {
        if (cf.type === "text" || cf.type === "number") {
          const val = currentFilters[cf.key] ?? "";
          next[cf.key] = val;
          if (prev[cf.key] !== val) {
            changed = true;
          }
        }
      });
      if (!changed && Object.keys(prev).length !== Object.keys(next).length) {
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [currentFiltersStr, searchKey, customFilterKeysStr]);

  const updateFilters = (updates: Record<string, string | null | undefined>) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", "1");

    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val.trim() === "") {
        params.delete(key);
      } else {
        params.set(key, val.trim());
      }
    });

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const removeSingleFilter = (key: string) => {
    updateFilters({ [key]: null });
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    const currentSize = searchParams?.get("size");
    if (currentSize) params.set("size", currentSize);
    params.set("page", "1");

    setSearchInput("");
    setIdInput("");
    setCustomTextInputs({});

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Determine active filter keys (ignoring undefined, empty, or page/size params)
  const activeEntries = Object.entries(currentFilters).filter(
    ([k, v]) => v !== undefined && v !== "" && k !== "page" && k !== "size"
  );
  const activeCount = activeEntries.length;

  const primaryCustomFilters = customFilters.filter((cf) => cf.isPrimary);
  const secondaryCustomFilters = customFilters.filter((cf) => !cf.isPrimary);

  const formatBadgeLabel = (key: string, value: string): string => {
    if (key === searchKey) {
      return `Search: "${value}"`;
    }
    if (key === "id") {
      return `ID: #${value}`;
    }
    if (key === "created_by" || key === "updated_by") {
      const u = users.find((usr) => String(usr.id) === value);
      const name = u ? u.name || u.email : `User #${value}`;
      return `${key === "created_by" ? "Created By" : "Updated By"}: ${name}`;
    }
    if (key === "created_from") return `Created From: ${value}`;
    if (key === "created_to") return `Created To: ${value}`;
    if (key === "updated_from") return `Updated From: ${value}`;
    if (key === "updated_to") return `Updated To: ${value}`;

    const cf = customFilters.find((c) => c.key === key);
    if (cf) {
      if (cf.options) {
        const opt = cf.options.find((o) => o.value === value);
        return `${cf.label}: ${opt ? opt.label : value}`;
      }
      return `${cf.label}: ${value}`;
    }

    return `${key}: ${value}`;
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
            <svg
              className="h-4 w-4"
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
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateFilters({ [searchKey]: searchInput });
            }}
            onBlur={() => {
              if (searchInput !== (currentFilters[searchKey] ?? "")) {
                updateFilters({ [searchKey]: searchInput });
              }
            }}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {primaryCustomFilters.map((cf) => {
          if (cf.type === "select" || (!cf.type && cf.options)) {
            return (
              <select
                key={cf.key}
                value={currentFilters[cf.key] ?? ""}
                onChange={(e) => updateFilters({ [cf.key]: e.target.value })}
                className="px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
              >
                <option value="">{cf.label}: All</option>
                {cf.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            );
          }

          if (cf.type === "text" || cf.type === "number") {
            const val = customTextInputs[cf.key] ?? "";
            return (
              <input
                key={cf.key}
                type={cf.type}
                placeholder={cf.placeholder ?? cf.label}
                value={val}
                onChange={(e) =>
                  setCustomTextInputs((prev) => ({
                    ...prev,
                    [cf.key]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") updateFilters({ [cf.key]: val });
                }}
                onBlur={() => {
                  if (val !== (currentFilters[cf.key] ?? "")) {
                    updateFilters({ [cf.key]: val });
                  }
                }}
                className="px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            );
          }

          return null;
        })}

        {/* Advanced Filters Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border transition-all cursor-pointer ${
            showAdvanced || activeCount > 0
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
              : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span>More Filters</span>
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>

        {/* Clear All Button */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-semibold text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors cursor-pointer px-2 py-1"
          >
            Clear All
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {secondaryCustomFilters.map((cf) => {
            if (cf.type === "select" || (!cf.type && cf.options)) {
              return (
                <div key={cf.key}>
                  <label className="block font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    {cf.label}
                  </label>
                  <select
                    value={currentFilters[cf.key] ?? ""}
                    onChange={(e) => updateFilters({ [cf.key]: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">All</option>
                    {cf.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            if (cf.type === "text" || cf.type === "number") {
              const val = customTextInputs[cf.key] ?? "";
              return (
                <div key={cf.key}>
                  <label className="block font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    {cf.label}
                  </label>
                  <input
                    type={cf.type}
                    placeholder={cf.placeholder ?? cf.label}
                    value={val}
                    onChange={(e) =>
                      setCustomTextInputs((prev) => ({
                        ...prev,
                        [cf.key]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") updateFilters({ [cf.key]: val });
                    }}
                    onBlur={() => {
                      if (val !== (currentFilters[cf.key] ?? "")) {
                        updateFilters({ [cf.key]: val });
                      }
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              );
            }

            if (cf.type === "date") {
              return (
                <div key={cf.key}>
                  <label className="block font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    {cf.label}
                  </label>
                  <input
                    type="date"
                    value={currentFilters[cf.key] ?? ""}
                    onChange={(e) => updateFilters({ [cf.key]: e.target.value })}
                    className="w-full px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                  />
                </div>
              );
            }

            return null;
          })}

          {!hideIdFilter && (
            <div>
              <label className="block font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Record ID
              </label>
              <input
                type="number"
                placeholder="e.g. 1"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                onBlur={() => {
                  if (idInput !== (currentFilters.id ?? "")) {
                    updateFilters({ id: idInput });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") updateFilters({ id: idInput });
                }}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          )}

          {!hideAuditFilters && (
            <>
              {users.length > 0 && (
                <div>
                  <label className="block font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Created By User
                  </label>
                  <select
                    value={currentFilters.created_by ?? ""}
                    onChange={(e) => updateFilters({ created_by: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">All Users</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name ?? u.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Created At From Date */}
              <div>
                <label className="block font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Created Date From
                </label>
                <input
                  type="date"
                  value={currentFilters.created_from ?? ""}
                  onChange={(e) => updateFilters({ created_from: e.target.value })}
                  className="w-full px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                />
              </div>

              {/* Created At To Date */}
              <div>
                <label className="block font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Created Date To
                </label>
                <input
                  type="date"
                  value={currentFilters.created_to ?? ""}
                  onChange={(e) => updateFilters({ created_to: e.target.value })}
                  className="w-full px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                />
              </div>

              {/* Updated By User */}
              {users.length > 0 && (
                <div>
                  <label className="block font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Updated By User
                  </label>
                  <select
                    value={currentFilters.updated_by ?? ""}
                    onChange={(e) => updateFilters({ updated_by: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">All Users</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name ?? u.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Updated At From Date */}
              <div>
                <label className="block font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Updated Date From
                </label>
                <input
                  type="date"
                  value={currentFilters.updated_from ?? ""}
                  onChange={(e) => updateFilters({ updated_from: e.target.value })}
                  className="w-full px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                />
              </div>

              {/* Updated At To Date */}
              <div>
                <label className="block font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Updated Date To
                </label>
                <input
                  type="date"
                  value={currentFilters.updated_to ?? ""}
                  onChange={(e) => updateFilters({ updated_to: e.target.value })}
                  className="w-full px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                />
              </div>
            </>
          )}
        </div>
      )}

      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mr-1">
            Active Filters:
          </span>
          {activeEntries.map(([key, val]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
            >
              {formatBadgeLabel(key, val!)}
              <button
                type="button"
                onClick={() => removeSingleFilter(key)}
                className="hover:text-emerald-950 dark:hover:text-emerald-100 font-bold ml-0.5 cursor-pointer"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
