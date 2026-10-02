"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { setFormErrors } from "@/lib/client-utils";
import {
  createThemeComponentAction,
  updateThemeComponentAction,
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

const DEFAULT_THEME_COLORS: ThemeColorsConfig = {
  bg_color: "#09090b",
  fg_color: "#18181b",
  text_color: "#ffffff",
  accent_color: "#f59e0b",
  hover_color: "#38bdf8",
  link_color: "#f59e0b",
};

export default function ThemeComponentModal({
  isOpen,
  onClose,
  themes,
  defaultThemeId,
  component,
}: ThemeComponentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  const isEditing = Boolean(component);

  // Color state
  const [colors, setColors] = useState<ThemeColorsConfig>(DEFAULT_THEME_COLORS);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    watch,
    formState: { errors },
  } = useForm<ThemeComponentCreateInput>({
    resolver: zodResolver(themeComponentCreateSchema) as any,
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
    if (isOpen) {
      setGlobalError(null);
      if (component) {
        const cfg = (component.theme_config ?? {}) as Record<string, any>;
        setColors({
          ...DEFAULT_THEME_COLORS,
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
        setColors(DEFAULT_THEME_COLORS);
        reset({
          theme_id: defaultThemeId || (themes[0]?.id ?? 1),
          name: "",
          component_type: "header",
          file_path: "",
          is_active: true,
          theme_config: {},
        });
      }
    }
  }, [component, defaultThemeId, themes, reset, isOpen]);

  const onSubmit = (data: ThemeComponentCreateInput) => {
    setGlobalError(null);
    const payload = {
      ...data,
      theme_id: Number(data.theme_id),
      theme_config: colors,
    };

    startTransition(async () => {
      try {
        const res = isEditing && component
          ? await updateThemeComponentAction(component.id, payload)
          : await createThemeComponentAction(payload);

        if (!res.success) {
          if (res.errors) {
            setFormErrors(res.errors, setError);
          }
          if (res.message) {
            setGlobalError(res.message);
            toast.error(res.message);
          }
          return;
        }

        toast.success(
          res.message ||
            (isEditing ? "Component updated successfully." : "Component registered successfully."),
        );
        onClose();
      } catch (err: any) {
        const msg = err.message || "An unexpected error occurred.";
        setGlobalError(msg);
        toast.error(msg);
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Header with Save Button on Top Right (CLIENT-SIDE-FORMS.md) */}
        <div className="flex items-start justify-between gap-4 border-b border-dashboard-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-dashboard-fg">
              {isEditing ? `Edit Component: ${component?.name}` : "Register Theme Component"}
            </h2>
            <p className="text-xs text-dashboard-muted mt-0.5">
              Registers a TypeScript component located relative to{" "}
              <code className="bg-dashboard-muted-bg text-dashboard-fg px-1.5 py-0.5 rounded text-[11px] font-mono">
                Themes/{selectedTheme?.slug || "<theme_slug>"}/
              </code>
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-dashboard-primary px-4 py-2 text-xs font-semibold text-dashboard-primary-fg shadow-xs hover:bg-dashboard-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition shrink-0"
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Register Component"
            )}
          </button>
        </div>

        {/* Global Error Banner */}
        {globalError && (
          <div className="rounded-xl border border-dashboard-danger/30 bg-dashboard-danger-subtle p-3 text-xs text-dashboard-danger font-medium">
            {globalError}
          </div>
        )}

        {/* Form Inputs */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                Parent Theme <span className="text-dashboard-danger">*</span>
              </label>
              <select
                {...register("theme_id", { valueAsNumber: true })}
                disabled={isPending}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg focus:outline-none focus:ring-2 focus:ring-dashboard-primary/40 transition disabled:opacity-60"
              >
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Themes/{t.slug}/)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                Component Slot / Type <span className="text-dashboard-danger">*</span>
              </label>
              <select
                {...register("component_type")}
                disabled={isPending}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg focus:outline-none focus:ring-2 focus:ring-dashboard-primary/40 transition disabled:opacity-60"
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
              <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                Component Display Name <span className="text-dashboard-danger">*</span>
              </label>
              <input
                {...register("name")}
                disabled={isPending}
                placeholder="e.g. Minimal Header Variant 1"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted focus:outline-none focus:ring-2 focus:ring-dashboard-primary/40 transition disabled:opacity-60"
              />
              {errors.name && (
                <p className="text-xs text-dashboard-danger mt-1 font-medium">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                Relative File Path <span className="text-dashboard-danger">*</span>
              </label>
              <input
                {...register("file_path")}
                disabled={isPending}
                placeholder="e.g. _components/headers/header-1.tsx"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted font-mono text-xs focus:outline-none focus:ring-2 focus:ring-dashboard-primary/40 transition disabled:opacity-60"
              />
              {errors.file_path && (
                <p className="text-xs text-dashboard-danger mt-1 font-medium">{errors.file_path.message}</p>
              )}
            </div>
          </div>

          {/* Theme Colors Palette */}
          <div className="pt-2">
            <ThemeColorsInput
              title="Default Component Color Palette"
              description="Default 6-color palette applied when this component is selected."
              value={colors}
              onChange={setColors}
            />
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="component-is-active-input"
              {...register("is_active")}
              disabled={isPending}
              className="h-4 w-4 rounded border-dashboard-border bg-dashboard-muted-bg text-dashboard-primary focus:ring-dashboard-primary/40"
            />
            <label
              htmlFor="component-is-active-input"
              className="text-xs font-medium text-dashboard-fg cursor-pointer select-none"
            >
              Component is Active & Selectable in Site Settings / Pages
            </label>
          </div>
        </div>

        {/* Footer with Cancel button */}
        <div className="flex items-center justify-end pt-3 border-t border-dashboard-border-subtle">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-dashboard-border bg-dashboard-card text-dashboard-muted hover:text-dashboard-fg hover:bg-dashboard-card-hover transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
