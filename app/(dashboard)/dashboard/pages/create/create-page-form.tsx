"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { createSitePage } from "@/actions/page-actions";
import MetaInput from "@/app/(dashboard)/_components/meta-input";
import { sitePageCreateSchema, SitePageCreateInput } from "@/lib/validations";
import { CRUD, theme, ThemeColorsConfig } from "@/lib/types";
import ThemeColorsInput from "@/app/(dashboard)/_components/theme-colors-input";

interface CreatePageFormProps {
  activeThemes: (theme & { components: any[] })[];
  permissions: CRUD;
}

export default function CreatePageForm({
  activeThemes = [],
  permissions,
}: CreatePageFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  const slotType = "page";
  const matchingThemes = activeThemes.filter((t) =>
    t.components && t.components.some((c: any) => c.component_type === slotType && c.is_active !== false),
  );

  const [selectedThemeId, setSelectedThemeId] = useState<string>("");
  const [selectedComponentId, setSelectedComponentId] = useState<string>("");

  const selectedTheme = activeThemes.find((t) => String(t.id) === selectedThemeId);
  const matchingComponents = selectedTheme
    ? selectedTheme.components.filter((c: any) => c.component_type === slotType && c.is_active !== false)
    : [];

  const [pageColors, setPageColors] = useState<ThemeColorsConfig>({
    bg_color: "#09090b",
    fg_color: "#18181b",
    text_color: "#ffffff",
    accent_color: "#f59e0b",
    hover_color: "#38bdf8",
    link_color: "#f59e0b",
  });

  const handleThemeChange = (newThemeId: string) => {
    setSelectedThemeId(newThemeId);
    if (!newThemeId) {
      setSelectedComponentId("");
      return;
    }
    const th = activeThemes.find((t) => String(t.id) === newThemeId);
    const firstComp = th?.components.find((c: any) => c.component_type === slotType && c.is_active !== false);
    if (firstComp) {
      setSelectedComponentId(String(firstComp.id));
      const cfg = (firstComp.theme_config ?? {}) as Record<string, any>;
      setPageColors({
        bg_color: cfg.bg_color || "#09090b",
        fg_color: cfg.fg_color || "#18181b",
        text_color: cfg.text_color || "#ffffff",
        accent_color: cfg.accent_color || "#f59e0b",
        hover_color: cfg.hover_color || "#38bdf8",
        link_color: cfg.link_color || "#f59e0b",
      });
    }
  };

  const handleComponentChange = (newCompId: string) => {
    setSelectedComponentId(newCompId);
    const comp = matchingComponents.find((c: any) => String(c.id) === newCompId);
    if (comp) {
      const cfg = (comp.theme_config ?? {}) as Record<string, any>;
      setPageColors({
        bg_color: cfg.bg_color || "#09090b",
        fg_color: cfg.fg_color || "#18181b",
        text_color: cfg.text_color || "#ffffff",
        accent_color: cfg.accent_color || "#f59e0b",
        hover_color: cfg.hover_color || "#38bdf8",
        link_color: cfg.link_color || "#f59e0b",
      });
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(sitePageCreateSchema),
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      custom_css: "",
      is_active: true,
      show_in_header: false,
      show_in_footer: true,
      sort_order: 0,
      meta_info: {
        title: "",
        description: "",
        keywords: "",
        og_title: "",
        og_description: "",
        og_image: "",
      },
    },
  });

  const slugValue = watch("slug");

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue("title", val, { shouldValidate: true });
    if (!slugValue) {
      const generatedSlug = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      setValue("slug", generatedSlug, { shouldValidate: true });
    }
  };

  const onSubmit = (data: SitePageCreateInput) => {
    if (!permissions.create) {
      toast("You do not have permission to create pages.", "error");
      return;
    }

    const selectedComp = matchingComponents.find(
      (c: any) => String(c.id) === selectedComponentId,
    );
    const theme_config =
      selectedThemeId && selectedComp
        ? {
            theme_id: Number(selectedThemeId),
            component_id: Number(selectedComponentId),
            theme_name: selectedTheme?.name,
            component_path: selectedComp.file_path,
            theme_config: pageColors,
          }
        : {};

    startTransition(async () => {
      try {
        const res = await createSitePage({
          ...data,
          theme_config,
        });

        if (res.success) {
          toast(res.message || "Page created successfully.", "success");
          router.push("/dashboard/pages");
        } else {
          toast(res.message || "Failed to create page.", "error");
          setGlobalError(res.message || "Failed to create page.");
        }
      } catch {
        toast("An unexpected error occurred.", "error");
        setGlobalError("An unexpected error occurred.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {globalError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Top Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
              New Storefront Page
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Create a custom CMS, informational, or policy page for your storefront.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <Link
              href="/dashboard/pages"
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending || !permissions.create}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 disabled:opacity-50 transition cursor-pointer"
            >
              {isPending ? "Creating Page..." : "Create Page"}
            </button>
          </div>
        </div>

        {/* Unified Single Form Container */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800">
          {/* Section 1: Page Identity & Visibility */}
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Page Identity & Visibility
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Define the page title, URL slug, navigation menus, and sort order.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Page Title *
                </label>
                <input
                  {...register("title")}
                  onChange={handleTitleChange}
                  placeholder="e.g. Careers, Press & Media, Size Guide"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.title && (
                  <p className="text-xs text-rose-500 mt-1">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Storefront Slug *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-400 text-xs font-mono select-none">
                    /
                  </span>
                  <input
                    {...register("slug")}
                    placeholder="careers"
                    className="w-full pl-6 pr-3 py-2 text-sm font-mono rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {errors.slug && (
                  <p className="text-xs text-rose-500 mt-1">
                    {errors.slug.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  {...register("sort_order")}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.sort_order && (
                  <p className="text-xs text-rose-500 mt-1">
                    {errors.sort_order.message}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="page_is_active"
                    {...register("is_active")}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700"
                  />
                  <label
                    htmlFor="page_is_active"
                    className="text-xs font-semibold cursor-pointer"
                  >
                    Active & Published
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="show_in_header"
                    {...register("show_in_header")}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700"
                  />
                  <label
                    htmlFor="show_in_header"
                    className="text-xs font-semibold cursor-pointer"
                  >
                    Show in Header Menu
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="show_in_footer"
                    {...register("show_in_footer")}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700"
                  />
                  <label
                    htmlFor="show_in_footer"
                    className="text-xs font-semibold cursor-pointer"
                  >
                    Show in Footer Menu
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                HTML / Rich Text Content (Optional)
              </label>
              <textarea
                {...register("content")}
                rows={8}
                placeholder="<h2>Page Section</h2><p>Provide body text or embedded HTML content for this page...</p>"
                className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.content && (
                <p className="text-xs text-rose-500 mt-1">
                  {errors.content.message}
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Theme Component Template */}
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Theme Component Template
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Select a custom component built in{" "}
                <code className="font-mono text-indigo-600 dark:text-indigo-400">
                  Themes/&lt;Name&gt;/
                </code>{" "}
                or use the default storefront template.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Theme Source
                </label>
                <select
                  value={selectedThemeId}
                  onChange={(e) => handleThemeChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none"
                >
                  <option value="">Default System Template</option>
                  {matchingThemes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Custom Theme)
                    </option>
                  ))}
                </select>
              </div>

              {selectedThemeId && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Component Variant
                  </label>
                  <select
                    value={selectedComponentId}
                    onChange={(e) => handleComponentChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none"
                  >
                    {matchingComponents.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.file_path})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {selectedThemeId && (
              <ThemeColorsInput
                title="Page Scoped Theme Colors"
                description="Customize the 6-color palette specifically for this page template."
                value={pageColors}
                onChange={setPageColors}
                disabled={!permissions.create}
                borderless={true}
              />
            )}
          </div>

          {/* Section 3: Page Custom CSS */}
          <div className="p-6 space-y-3">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Page Custom CSS
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Custom CSS injected specifically when viewing this page. Overrides site-wide styles.
              </p>
            </div>
            <textarea
              {...register("custom_css")}
              rows={6}
              placeholder={`/* Page-scoped custom CSS */\n.page-enter {\n  /* custom styles */\n}`}
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-100 dark:bg-zinc-950 outline-none resize-y focus:ring-2 focus:ring-indigo-500"
            />
            {errors.custom_css && (
              <p className="text-xs text-rose-500 mt-1">
                {errors.custom_css.message}
              </p>
            )}
          </div>

          {/* Section 4: SEO Metadata */}
          <div className="p-6">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              Page SEO & OpenGraph Metadata
            </h3>
            <MetaInput
              register={register}
              watch={watch}
              setValue={setValue}
              errors={errors}
              prefix="meta_info"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
