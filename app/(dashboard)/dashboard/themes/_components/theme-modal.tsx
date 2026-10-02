"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { setFormErrors } from "@/lib/client-utils";
import { createThemeAction, updateThemeAction } from "@/actions/theme-actions";
import { themeCreateSchema, ThemeCreateInput } from "@/lib/validations";
import type { theme } from "@/lib/types";

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: theme | null;
}

export default function ThemeModal({ isOpen, onClose, theme }: ThemeModalProps) {
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  const isEditing = Boolean(theme);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<ThemeCreateInput>({
    resolver: zodResolver(themeCreateSchema) as any,
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (isOpen) {
      setGlobalError(null);
      if (theme) {
        reset({
          name: theme.name,
          slug: theme.slug,
          description: theme.description || "",
          is_active: theme.is_active,
        });
      } else {
        reset({
          name: "",
          slug: "",
          description: "",
          is_active: true,
        });
      }
    }
  }, [theme, reset, isOpen]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue("name", val);
    if (!isEditing) {
      const generatedSlug = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setValue("slug", generatedSlug, { shouldValidate: true });
    }
  };

  const onSubmit = (data: ThemeCreateInput) => {
    setGlobalError(null);
    startTransition(async () => {
      try {
        const res = isEditing && theme
          ? await updateThemeAction(theme.id, data)
          : await createThemeAction(data);

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

        toast.success(res.message || (isEditing ? "Theme updated successfully." : "Theme created successfully."));
        onClose();
      } catch (err: any) {
        const msg = err.message || "An unexpected error occurred.";
        setGlobalError(msg);
        toast.error(msg);
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Header with Save Button on Top Right (CLIENT-SIDE-FORMS.md) */}
        <div className="flex items-start justify-between gap-4 border-b border-dashboard-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-dashboard-fg">
              {isEditing ? `Edit Theme: ${theme?.name}` : "Create New Theme"}
            </h2>
            <p className="text-xs text-dashboard-muted mt-0.5">
              Themes define the root folders inside <code className="bg-dashboard-muted-bg text-dashboard-fg px-1.5 py-0.5 rounded text-[11px] font-mono">Themes/&lt;slug&gt;/</code>.
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
              "Create Theme"
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
          <div>
            <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
              Theme Display Name <span className="text-dashboard-danger">*</span>
            </label>
            <input
              {...register("name")}
              onChange={handleNameChange}
              disabled={isPending}
              placeholder="e.g. Dream, Minimalist, Cyber"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted focus:outline-none focus:ring-2 focus:ring-dashboard-primary/40 transition disabled:opacity-60"
            />
            {errors.name && (
              <p className="text-xs text-dashboard-danger mt-1 font-medium">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
              Folder Name / Slug <span className="text-dashboard-danger">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-mono text-dashboard-muted select-none">
                Themes/
              </span>
              <input
                {...register("slug")}
                disabled={isPending}
                placeholder="dream"
                className="w-full pl-[4.5rem] pr-3.5 py-2 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted font-mono text-xs focus:outline-none focus:ring-2 focus:ring-dashboard-primary/40 transition disabled:opacity-60"
              />
            </div>
            {errors.slug && (
              <p className="text-xs text-dashboard-danger mt-1 font-medium">{errors.slug.message}</p>
            )}
            <p className="text-[11px] text-dashboard-muted mt-1">
              Must match the directory name inside <code className="font-mono">Themes/</code> (letters, numbers, hyphens, and underscores only).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
              Description
            </label>
            <textarea
              {...register("description")}
              disabled={isPending}
              rows={3}
              placeholder="Describe this theme aesthetic or target branding style..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted focus:outline-none focus:ring-2 focus:ring-dashboard-primary/40 transition resize-none disabled:opacity-60"
            />
            {errors.description && (
              <p className="text-xs text-dashboard-danger mt-1 font-medium">{errors.description.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="theme-is-active-input"
              {...register("is_active")}
              disabled={isPending}
              className="h-4 w-4 rounded border-dashboard-border bg-dashboard-muted-bg text-dashboard-primary focus:ring-dashboard-primary/40"
            />
            <label
              htmlFor="theme-is-active-input"
              className="text-xs font-medium text-dashboard-fg cursor-pointer select-none"
            >
              Theme is Active & Visible in Component Registries
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
