"use client";

import React from "react";
import { ThemeColorsConfig } from "@/lib/types";

export interface ThemeColorsInputProps {
  title?: string;
  description?: string;
  value: ThemeColorsConfig;
  onChange: (colors: ThemeColorsConfig) => void;
  disabled?: boolean;
  className?: string;
  borderless?: boolean;
}

const COLOR_FIELDS: { key: keyof ThemeColorsConfig; label: string; defaultVal: string }[] = [
  { key: "bg_color", label: "Background (bg_color)", defaultVal: "#09090b" },
  { key: "fg_color", label: "Foreground / Surface (fg_color)", defaultVal: "#18181b" },
  { key: "text_color", label: "Text Color (text_color)", defaultVal: "#ffffff" },
  { key: "accent_color", label: "Accent Highlight (accent_color)", defaultVal: "#f59e0b" },
  { key: "hover_color", label: "Hover State (hover_color)", defaultVal: "#38bdf8" },
  { key: "link_color", label: "Link Color (link_color)", defaultVal: "#f59e0b" },
];

export default function ThemeColorsInput({
  title = "Theme Color Palette",
  description,
  value = {},
  onChange,
  disabled = false,
  className = "",
  borderless = false,
}: ThemeColorsInputProps) {
  const handleFieldChange = (key: keyof ThemeColorsConfig, val: string) => {
    onChange({
      ...value,
      [key]: val,
    });
  };

  const containerClasses = borderless
    ? `space-y-4 ${className}`
    : `rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-xs ${className}`;

  return (
    <div className={containerClasses}>
      {title && (
        <div className="space-y-1">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {COLOR_FIELDS.map(({ key, label, defaultVal }) => {
          const currentVal = (value[key] as string) || defaultVal;
          return (
            <div
              key={key}
              className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5"
            >
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                {label}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentVal}
                  disabled={disabled}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  className="h-8 w-8 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0 disabled:opacity-50"
                />
                <input
                  type="text"
                  value={currentVal}
                  disabled={disabled}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  placeholder={defaultVal}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
