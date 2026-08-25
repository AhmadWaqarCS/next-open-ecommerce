"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { createTheme, updateTheme } from "@/actions/theme-actions";
import { themeCreateSchema, ThemeCreateInput } from "@/lib/validations";
import type { theme } from "@/lib/types";

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: theme | null;
}

export default function ThemeModal({ isOpen, onClose, theme }: ThemeModalProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const isEditing = Boolean(theme);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(themeCreateSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
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
  }, [theme, reset, isOpen]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue("name", val);
    if (!isEditing) {
      setValue("slug", val, { shouldValidate: true });
    }
  };

  const onSubmit = (data: ThemeCreateInput) => {
    startTransition(async () => {
      try {
        const res = isEditing && theme
          ? await updateTheme(theme.id, data)
          : await createTheme(data);

        if (res.success) {
          toast(res.message || "Theme saved successfully.", "success");
          onClose();
        } else {
          toast(res.message || "Failed to save theme.", "error");
        }
      } catch (err) {
        toast("An unexpected error occurred.", "error");
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {isEditing ? `Edit Theme: ${theme?.name}` : "Create New Theme"}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Themes define the root folders inside <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">Themes/&lt;Name&gt;/</code>.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Theme Name *
            </label>
            <input
              {...register("name")}
              onChange={handleNameChange}
              placeholder="e.g. Dream"
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {errors.name && (
              <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Slug / Folder Identifier *
            </label>
            <input
              {...register("slug")}
              placeholder="e.g. dream"
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs"
            />
            {errors.slug && (
              <p className="text-xs text-rose-500 mt-1">{errors.slug.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Description
            </label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="Describe this theme aesthetic or target brand..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="theme-is-active"
              {...register("is_active")}
              className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700"
            />
            <label
              htmlFor="theme-is-active"
              className="text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              Theme is Active
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
              {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Theme"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
