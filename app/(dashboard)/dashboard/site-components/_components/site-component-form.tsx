"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { setFormErrors } from "@/lib/client-utils";
import {
  createSiteComponent,
  updateSiteComponent,
} from "@/actions/site-component-actions";
import {
  SiteComponentCreateInput,
  siteComponentCreateSchema,
  siteComponentUpdateSchema,
} from "@/lib/validations";

interface SiteComponentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    id: number;
    name: string;
    component_key: string;
    category: string;
    description: string | null;
    default_props: any;
    thumbnail_url: string | null;
    is_active: boolean;
  } | null;
}

export default function SiteComponentFormModal({
  isOpen,
  onClose,
  initialData,
}: SiteComponentFormModalProps) {
  const isEdit = Boolean(initialData);
  const [isPending, startTransition] = useTransition();
  const [propsJson, setPropsJson] = useState(
    initialData?.default_props
      ? JSON.stringify(initialData.default_props, null, 2)
      : "{}",
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<SiteComponentCreateInput>({
    resolver: zodResolver(
      isEdit ? siteComponentUpdateSchema : siteComponentCreateSchema,
    ) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      component_key: initialData?.component_key ?? "",
      category: initialData?.category ?? "section",
      description: initialData?.description ?? "",
      thumbnail_url: initialData?.thumbnail_url ?? "",
      is_active: initialData?.is_active ?? true,
    },
  });

  const handleModalClose = () => {
    reset();
    setJsonError(null);
    onClose();
  };

  const onSubmit = (data: SiteComponentCreateInput) => {
    setJsonError(null);
    let parsedProps = {};
    if (propsJson.trim()) {
      try {
        parsedProps = JSON.parse(propsJson);
      } catch (err) {
        setJsonError("Invalid JSON format for Default Props");
        return;
      }
    }

    startTransition(async () => {
      const payload = {
        ...data,
        default_props: parsedProps,
      };

      let res;
      if (isEdit && initialData) {
        res = await updateSiteComponent(initialData.id, payload);
      } else {
        res = await createSiteComponent(payload);
      }

      if (!res.success) {
        if (res.errors) {
          setFormErrors(res.errors, setError);
        }
        toast(res.message || "An error occurred", "error");
        return;
      }

      toast(
        res.message ||
          `Component ${isEdit ? "updated" : "created"} successfully.`,
        "success",
      );
      handleModalClose();
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose}>
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {isEdit ? "Edit Site Component" : "Create Site Component"}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
              Component Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Hero Banner, Featured Products"
              {...register("name")}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
              Component Key *
            </label>
            <input
              type="text"
              placeholder="e.g. hero_banner, featured_products"
              {...register("component_key")}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            {errors.component_key && (
              <p className="mt-1 text-xs text-red-500">
                {errors.component_key.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                Category
              </label>
              <select
                {...register("category")}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                <option value="hero">Hero</option>
                <option value="products">Products</option>
                <option value="content">Content</option>
                <option value="marketing">Marketing</option>
                <option value="section">Section</option>
              </select>
            </div>

            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("is_active")}
                  className="w-4 h-4 rounded-sm text-emerald-600 border-zinc-300 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
                />
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Active
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Brief component description..."
              {...register("description")}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
              Default Props (JSON)
            </label>
            <textarea
              rows={3}
              value={propsJson}
              onChange={(e) => setPropsJson(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            {jsonError && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                {jsonError}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleModalClose}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
