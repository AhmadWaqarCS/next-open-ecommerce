"use client";

import { useEffect, useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import {
  createThemeComponent,
  updateThemeComponent,
} from "@/actions/theme-actions";
import {
  themeComponentCreateSchema,
  ThemeComponentCreateInput,
} from "@/lib/validations";
import type { theme, theme_component, ThemeColorsConfig } from "@/lib/types";
import ThemeColorsInput from "@/app/(dashboard)/_components/theme-colors-input";

interface ThemeComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  themes: theme[];
  defaultThemeId?: number;
  component?: theme_component | null;
}

export default function ThemeComponentModal({
  isOpen,
  onClose,
  themes,
  defaultThemeId,
  component,
}: ThemeComponentModalProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const isEditing = Boolean(component);

  // Color state
  const [colors, setColors] = useState<ThemeColorsConfig>({
    bg_color: "#09090b",
    fg_color: "#18181b",
    text_color: "#ffffff",
    accent_color: "#f59e0b",
    hover_color: "#38bdf8",
    link_color: "#f59e0b",
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(themeComponentCreateSchema),
    defaultValues: {
      theme_id: defaultThemeId || (themes[0]?.id ?? 1),
      name: "",
      component_type: "header",
      file_path: "",
      is_active: true,
      theme_config: {},
    },
  });

  const selectedThemeId = watch("theme_id");
  const selectedTheme = themes.find((t) => t.id === Number(selectedThemeId));

  useEffect(() => {
    if (component) {
      const cfg = (component.theme_config ?? {}) as Record<string, any>;
      setColors({
        bg_color: cfg.bg_color || "#09090b",
        fg_color: cfg.fg_color || "#18181b",
        text_color: cfg.text_color || "#ffffff",
        accent_color: cfg.accent_color || "#f59e0b",
        hover_color: cfg.hover_color || "#38bdf8",
        link_color: cfg.link_color || "#f59e0b",
        ...cfg,
      });

      reset({
        theme_id: component.theme_id,
        name: component.name,
        component_type: component.component_type as any,
        file_path: component.file_path,
        is_active: component.is_active,
        theme_config: cfg,
      });
    } else {
      setColors({
        bg_color: "#09090b",
        fg_color: "#18181b",
        text_color: "#ffffff",
        accent_color: "#f59e0b",
        hover_color: "#38bdf8",
        link_color: "#f59e0b",
      });

      reset({
        theme_id: defaultThemeId || (themes[0]?.id ?? 1),
        name: "",
        component_type: "header",
        file_path: "",
        is_active: true,
        theme_config: {},
      });
    }
  }, [component, defaultThemeId, themes, reset, isOpen]);

  const onSubmit = (data: ThemeComponentCreateInput) => {
    const payload = {
      ...data,
      theme_id: Number(data.theme_id),
      theme_config: colors,
    };

    startTransition(async () => {
      try {
        const res = isEditing && component
          ? await updateThemeComponent(component.id, payload)
          : await createThemeComponent(payload);

        if (res.success) {
          toast(res.message || "Component registered successfully.", "success");
          onClose();
        } else {
          toast(res.message || "Failed to register component.", "error");
        }
      } catch (err) {
        toast("An unexpected error occurred.", "error");
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {isEditing ? `Edit Component: ${component?.name}` : "Register Theme Component"}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Registers a TypeScript component located relative to{" "}
            <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
              Themes/{selectedTheme?.name || "<Theme>"}/
            </code>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Parent Theme *
              </label>
              <select
                {...register("theme_id", { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (/{t.slug})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Component Slot / Type *
              </label>
              <select
                {...register("component_type")}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="header">Header (Layout Header)</option>
                <option value="footer">Footer (Layout Footer)</option>
                <option value="home">Home (Page Main)</option>
                <option value="product">Product Detail (Page Main)</option>
                <option value="category">Category Detail (Page Main)</option>
                <option value="page">Custom CMS Page</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Component Display Name *
              </label>
              <input
                {...register("name")}
                placeholder="e.g. Header Variant 1"
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {errors.name && (
                <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Relative File Path *
              </label>
              <input
                {...register("file_path")}
                placeholder="e.g. _components/headers/header-1.tsx"
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs"
              />
              {errors.file_path && (
                <p className="text-xs text-rose-500 mt-1">{errors.file_path.message}</p>
              )}
            </div>
          </div>

          {/* Theme Colors Palette */}
          <ThemeColorsInput
            title="Default Component Colors (Theme Config JSON)"
            description="Configure the default 6-color palette for this component variant."
            value={colors}
            onChange={setColors}
          />

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="component-is-active"
              {...register("is_active")}
              className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700"
            />
            <label
              htmlFor="component-is-active"
              className="text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              Component is Active & Available for Selection
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20 disabled:opacity-50 transition"
            >
              {isPending ? "Saving..." : isEditing ? "Save Component" : "Register Component"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
