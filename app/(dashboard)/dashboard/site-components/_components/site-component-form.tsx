"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { setFormErrors } from "@/lib/client-utils";
import ImageInput from "@/app/(dashboard)/_components/image-input";
import {
  createSiteComponent,
  updateSiteComponent,
} from "@/actions/site-component-actions";
import {
  SiteComponentCreateInput,
  siteComponentCreateSchema,
  siteComponentUpdateSchema,
} from "@/lib/validations";
import { site_component } from "@/lib/generated/prisma/client";

interface KeyValuePair {
  key: string;
  value: string;
}

interface SiteComponentFormProps {
  initialData?: site_component | null;
}

export default function SiteComponentForm({ initialData }: SiteComponentFormProps) {
  const isEdit = Boolean(initialData);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Extract initial default props into structured fields
  const initialPropsObj = (initialData?.default_props as Record<string, any>) || {};

  const [thumbnailUrl, setThumbnailUrl] = useState<string>(
    initialData?.thumbnail_url || "",
  );
  const [limit, setLimit] = useState<number | "">(
    typeof initialPropsObj.limit === "number" ? initialPropsObj.limit : 4,
  );
  const [layoutStyle, setLayoutStyle] = useState<string>(
    initialPropsObj.layout_style || "grid",
  );
  const [showTitle, setShowTitle] = useState<boolean>(
    initialPropsObj.show_title !== false,
  );
  const [customClass, setCustomClass] = useState<string>(
    initialPropsObj.custom_class || "",
  );

  // Filter out built-in props to populate custom key-value pairs
  const initialCustomPairs: KeyValuePair[] = Object.entries(initialPropsObj)
    .filter(
      ([k]) => !["limit", "layout_style", "show_title", "custom_class"].includes(k),
    )
    .map(([k, v]) => ({
      key: k,
      value: typeof v === "object" ? JSON.stringify(v) : String(v),
    }));

  const [customPairs, setCustomPairs] = useState<KeyValuePair[]>(initialCustomPairs);

  const {
    register,
    handleSubmit,
    setError,
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

  const handleAddCustomPair = () => {
    setCustomPairs([...customPairs, { key: "", value: "" }]);
  };

  const handleRemoveCustomPair = (index: number) => {
    setCustomPairs(customPairs.filter((_, i) => i !== index));
  };

  const handleCustomPairChange = (
    index: number,
    field: "key" | "value",
    val: string,
  ) => {
    const updated = [...customPairs];
    updated[index][field] = val;
    setCustomPairs(updated);
  };

  const onSubmit = (data: SiteComponentCreateInput) => {
    // Construct default_props object from structured fields
    const defaultPropsPayload: Record<string, any> = {
      layout_style: layoutStyle,
      show_title: showTitle,
    };

    if (limit !== "") {
      defaultPropsPayload.limit = Number(limit);
    }
    if (customClass.trim()) {
      defaultPropsPayload.custom_class = customClass.trim();
    }

    // Append key-value pairs
    for (const pair of customPairs) {
      if (pair.key.trim()) {
        const k = pair.key.trim();
        const v = pair.value.trim();
        if (v === "true") defaultPropsPayload[k] = true;
        else if (v === "false") defaultPropsPayload[k] = false;
        else if (!isNaN(Number(v)) && v !== "") defaultPropsPayload[k] = Number(v);
        else defaultPropsPayload[k] = v;
      }
    }

    startTransition(async () => {
      const payload = {
        ...data,
        thumbnail_url: thumbnailUrl || null,
        default_props: defaultPropsPayload,
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
      router.push("/dashboard/site-components");
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* SECTION 1: General Details */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            General Information
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Basic component name, system key identifier, and display category.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Component Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
              Component Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Hero Banner, Featured Products Grid"
              {...register("name")}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
            {errors.name && (
              <p className="mt-1.5 text-xs font-medium text-rose-500">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Component Key */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
              Component Key *
            </label>
            <input
              type="text"
              placeholder="e.g. hero_banner, featured_products"
              {...register("component_key")}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
            {errors.component_key && (
              <p className="mt-1.5 text-xs font-medium text-rose-500">
                {errors.component_key.message}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
              Category
            </label>
            <select
              {...register("category")}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            >
              <option value="hero">Hero</option>
              <option value="products">Products</option>
              <option value="content">Content</option>
              <option value="marketing">Marketing</option>
              <option value="section">Section</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Active Status */}
          <div className="flex items-center pt-6">
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register("is_active")}
                className="w-5 h-5 rounded-md text-emerald-600 border-zinc-300 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                  Active Component
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                  Available for dynamic storefront layout builders.
                </span>
              </div>
            </label>
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Provide details about what this UI component section renders..."
              {...register("description")}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: Component Thumbnail */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Component Preview Thumbnail
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Optional preview image displayed in page builder registries.
          </p>
        </div>

        <ImageInput
          label="Thumbnail Image"
          value={thumbnailUrl}
        />
      </div>

      {/* SECTION 3: Default Component Configuration & Attributes */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Default Properties &amp; Settings
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Configure component defaults using simple controls instead of raw JSON.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Display Item Limit */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
              Item Display Limit
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={limit}
              onChange={(e) =>
                setLimit(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="e.g. 4"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
            <span className="text-[11px] text-zinc-400 mt-1 block">
              Default number of items to display (e.g. featured products count).
            </span>
          </div>

          {/* Layout Style */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
              Layout Style
            </label>
            <select
              value={layoutStyle}
              onChange={(e) => setLayoutStyle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            >
              <option value="grid">Grid Layout</option>
              <option value="carousel">Carousel Slider</option>
              <option value="full_width">Full Width Container</option>
              <option value="stacked">Stacked Banner</option>
              <option value="sidebar">Sidebar Layout</option>
            </select>
          </div>

          {/* Custom CSS Class */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
              Custom CSS Class
            </label>
            <input
              type="text"
              value={customClass}
              onChange={(e) => setCustomClass(e.target.value)}
              placeholder="e.g. py-12 bg-zinc-900 text-white"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
          </div>

          {/* Show Header Title Toggle */}
          <div className="flex items-center pt-4">
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showTitle}
                onChange={(e) => setShowTitle(e.target.checked)}
                className="w-5 h-5 rounded-md text-emerald-600 border-zinc-300 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                  Show Section Header Title
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                  Render component section heading on storefront.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Custom Property Pairs */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Additional Component Attributes
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Add custom property key-value pairs visually without writing raw JSON syntax.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddCustomPair}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Attribute</span>
            </button>
          </div>

          {customPairs.length === 0 ? (
            <p className="text-xs text-zinc-400 italic">
              No extra attributes added. Click &quot;Add Attribute&quot; to define custom component options.
            </p>
          ) : (
            <div className="space-y-3">
              {customPairs.map((pair, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Attribute Key (e.g. columns)"
                    value={pair.key}
                    onChange={(e) =>
                      handleCustomPairChange(idx, "key", e.target.value)
                    }
                    className="flex-1 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 3, true, dark)"
                    value={pair.value}
                    onChange={(e) =>
                      handleCustomPairChange(idx, "value", e.target.value)
                    }
                    className="flex-1 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomPair(idx)}
                    className="p-2 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Remove Attribute"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <Link
          href="/dashboard/site-components"
          className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
        >
          {isPending ? "Saving..." : isEdit ? "Save Component" : "Create Component"}
        </button>
      </div>
    </form>
  );
}
