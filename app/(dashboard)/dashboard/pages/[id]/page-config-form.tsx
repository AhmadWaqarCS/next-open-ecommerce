"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { updateSitePage } from "@/actions/page-actions";
import MetaInput from "@/app/(dashboard)/_components/meta-input";
import { sitePageUpdateSchema, SitePageUpdateInput } from "@/lib/validations";
import { CRUD, site_page, theme, ThemeColorsConfig, PROTECTED_SYSTEM_SLUGS } from "@/lib/types";
import ThemeColorsInput from "@/app/(dashboard)/_components/theme-colors-input";

interface PageConfigFormProps {
  page: site_page;
  activeThemes: (theme & { components: any[] })[];
  permissions: CRUD;
}

export default function PageConfigForm({
  page,
  activeThemes = [],
  permissions,
}: PageConfigFormProps) {
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  const isProtectedSystemPage = PROTECTED_SYSTEM_SLUGS.includes(page.slug);
  const pageThemeConfig = (page.theme_config ?? {}) as Record<string, any>;

  // Determine target component slot type based on slug
  let slotType: "home" | "product" | "category" | "page" = "page";
  if (page.slug === "/") slotType = "home";
  else if (page.slug === "product" || page.slug === "product/[slug]")
    slotType = "product";
  else if (page.slug === "category" || page.slug === "category/[slug]")
    slotType = "category";

  // Filter themes having active component of slotType
  const matchingThemes = activeThemes.filter(
    (t) =>
      t.components &&
      t.components.some(
        (c: any) => c.component_type === slotType && c.is_active !== false,
      ),
  );

  const [selectedThemeId, setSelectedThemeId] = useState<string>(
    pageThemeConfig.theme_id ? String(pageThemeConfig.theme_id) : "",
  );
  const [selectedComponentId, setSelectedComponentId] = useState<string>(
    pageThemeConfig.component_id ? String(pageThemeConfig.component_id) : "",
  );

  const selectedTheme = activeThemes.find(
    (t) => String(t.id) === selectedThemeId,
  );
  const matchingComponents = selectedTheme
    ? selectedTheme.components.filter(
        (c: any) => c.component_type === slotType && c.is_active !== false,
      )
    : [];

  // Theme Config Colors
  const [pageColors, setPageColors] = useState<ThemeColorsConfig>({
    bg_color: pageThemeConfig.theme_config?.bg_color || "#09090b",
    fg_color: pageThemeConfig.theme_config?.fg_color || "#18181b",
    text_color: pageThemeConfig.theme_config?.text_color || "#ffffff",
    accent_color: pageThemeConfig.theme_config?.accent_color || "#f59e0b",
    hover_color: pageThemeConfig.theme_config?.hover_color || "#38bdf8",
    link_color: pageThemeConfig.theme_config?.link_color || "#f59e0b",
    ...(pageThemeConfig.theme_config || {}),
  });

  const handleThemeChange = (newThemeId: string) => {
    setSelectedThemeId(newThemeId);
    if (!newThemeId) {
      setSelectedComponentId("");
      return;
    }
    const th = activeThemes.find((t) => String(t.id) === newThemeId);
    const firstComp = th?.components.find(
      (c: any) => c.component_type === slotType && c.is_active !== false,
    );
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
    resolver: zodResolver(sitePageUpdateSchema),
    defaultValues: {
      title: page.title || "",
      slug: page.slug || "",
      content: page.content || "",
      custom_css: page.custom_css || "",
      is_active: page.is_active ?? true,
      show_in_header: page.show_in_header ?? false,
      show_in_footer: page.show_in_footer ?? false,
      sort_order: page.sort_order ?? 0,
      meta_info: (page.meta_info ?? {}) as Record<string, string>,
    },
  });

  const onSubmit = (data: SitePageUpdateInput) => {
    if (!permissions.update) {
      toast("You do not have permission to update this page.", "error");
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
        const res = await updateSitePage(page.id, {
          title: data.title,
          slug: isProtectedSystemPage ? undefined : data.slug,
          content: data.content || null,
          custom_css: data.custom_css || null,
          is_active: data.is_active,
          show_in_header: data.show_in_header,
          show_in_footer: data.show_in_footer,
          sort_order: data.sort_order,
          meta_info: data.meta_info,
          theme_config,
        });

        if (res.success) {
          toast(
            res.message || "Page configuration saved successfully.",
            "success",
          );
          setGlobalError(null);
        } else {
          toast(res.message || "Failed to save page configuration.", "error");
          setGlobalError(res.message || "Failed to save.");
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
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {page.title}
              </h2>
              {isProtectedSystemPage && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                  Core System Page
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Storefront route: {page.slug === "/" ? "/" : `/${page.slug}`}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <a
              href={page.slug === "/" ? "/" : `/${page.slug}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition flex items-center gap-1.5"
            >
              <span>View live</span>
              <svg
                className="w-3.5 h-3.5 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>

            <button
              type="submit"
              disabled={isPending || !permissions.update}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 disabled:opacity-50 transition cursor-pointer"
            >
              {isPending ? "Saving Page..." : "Save Page Configuration"}
            </button>
          </div>
        </div>

        {/* Unified Single Form Container */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800">
          {/* Section 1: Page Details & Visibility */}
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Page Details & Visibility
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Configure title, storefront route slug, sort order, and menu placements.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Page Title *
                </label>
                <input
                  {...register("title")}
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
                  Storefront Slug {isProtectedSystemPage && "(Locked)"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-400 text-xs font-mono select-none">
                    /
                  </span>
                  <input
                    {...register("slug")}
                    disabled={isProtectedSystemPage}
                    className={`w-full pl-6 pr-3 py-2 text-sm font-mono rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none ${
                      isProtectedSystemPage
                        ? "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 cursor-not-allowed"
                        : "bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500"
                    }`}
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
                  className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.sort_order && (
                  <p className="text-xs text-rose-500 mt-1">
                    {errors.sort_order.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2">
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
                  Page is Active
                </label>
              </div>

              {page.slug !== "/" && (
                <>
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
                </>
              )}
            </div>

            {/* Optional Content for standard CMS pages */}
            {page.slug !== "/" &&
              page.slug !== "product" &&
              page.slug !== "category" &&
              !page.slug.includes("[slug]") && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    HTML / Rich Text Content (Optional)
                  </label>
                  <textarea
                    {...register("content")}
                    rows={8}
                    placeholder="<h2>Page Heading</h2><p>Page body content...</p>"
                    className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.content && (
                    <p className="text-xs text-rose-500 mt-1">
                      {errors.content.message}
                    </p>
                  )}
                </div>
              )}
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
                disabled={!permissions.update}
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
