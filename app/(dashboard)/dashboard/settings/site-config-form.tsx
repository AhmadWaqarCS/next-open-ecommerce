"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "../../_components/toast-context";
import {
  updateSiteConfig,
  revalidateSitemapAction,
} from "@/actions/site-actions";
import { uploadMediaImage } from "@/actions/media-actions";
import MetaInput from "@/app/(dashboard)/_components/meta-input";
import {
  SiteConfigUpdateInput,
  siteConfigUpdateSchema,
} from "@/lib/validations";
import { CRUD, theme, ThemeColorsConfig } from "@/lib/types";
import ImageInput from "../../_components/image-input";
import ImageInputGroup from "../../_components/image-input-group";
import ThemeColorsInput from "../../_components/theme-colors-input";

interface SiteConfigFormProps {
  initialData: any;
  activeThemes: (theme & { components: any[] })[];
  permissions: CRUD;
}

const TABS = [
  { id: "general", label: "General & Branding", icon: "🌐" },
  { id: "theme", label: "Themes & Layout", icon: "🎨" },
  { id: "checkout", label: "Business & Checkout", icon: "💳" },
  { id: "contact", label: "Contact & Socials", icon: "📱" },
  { id: "security", label: "Security & SEO", icon: "🛡️" },
];

export default function SiteConfigForm({
  initialData,
  activeThemes = [],
  permissions,
}: SiteConfigFormProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  const [pendingLightLogo, setPendingLightLogo] = useState<File | null>(null);
  const [pendingDarkLogo, setPendingDarkLogo] = useState<File | null>(null);
  const [pendingFavicon, setPendingFavicon] = useState<File | null>(null);

  const [isRevalidatingSitemap, setIsRevalidatingSitemap] = useState(false);

  // Global Theme Color States
  const [globalColors, setGlobalColors] = useState<ThemeColorsConfig>({
    bg_color: initialData.theme_config?.bg_color || "#09090b",
    fg_color: initialData.theme_config?.fg_color || "#18181b",
    text_color: initialData.theme_config?.text_color || "#ffffff",
    accent_color: initialData.theme_config?.accent_color || "#f59e0b",
    hover_color: initialData.theme_config?.hover_color || "#38bdf8",
    link_color: initialData.theme_config?.link_color || "#f59e0b",
    ...(initialData.theme_config || {}),
  });

  // Header Theme Component State
  const initialHeaderCfg = initialData.header_config || {};
  const [headerThemeId, setHeaderThemeId] = useState<string>(
    initialHeaderCfg.theme_id ? String(initialHeaderCfg.theme_id) : "",
  );
  const [headerComponentId, setHeaderComponentId] = useState<string>(
    initialHeaderCfg.component_id ? String(initialHeaderCfg.component_id) : "",
  );
  const [headerColors, setHeaderColors] = useState<ThemeColorsConfig>({
    bg_color: initialHeaderCfg.theme_config?.bg_color || initialData.theme_config?.bg_color || "#09090b",
    fg_color: initialHeaderCfg.theme_config?.fg_color || initialData.theme_config?.fg_color || "#18181b",
    text_color: initialHeaderCfg.theme_config?.text_color || initialData.theme_config?.text_color || "#ffffff",
    accent_color: initialHeaderCfg.theme_config?.accent_color || initialData.theme_config?.accent_color || "#f59e0b",
    hover_color: initialHeaderCfg.theme_config?.hover_color || initialData.theme_config?.hover_color || "#38bdf8",
    link_color: initialHeaderCfg.theme_config?.link_color || initialData.theme_config?.link_color || "#f59e0b",
    ...(initialHeaderCfg.theme_config || {}),
  });

  // Footer Theme Component State
  const initialFooterCfg = initialData.footer_config || {};
  const [footerThemeId, setFooterThemeId] = useState<string>(
    initialFooterCfg.theme_id ? String(initialFooterCfg.theme_id) : "",
  );
  const [footerComponentId, setFooterComponentId] = useState<string>(
    initialFooterCfg.component_id ? String(initialFooterCfg.component_id) : "",
  );
  const [footerColors, setFooterColors] = useState<ThemeColorsConfig>({
    bg_color: initialFooterCfg.theme_config?.bg_color || initialData.theme_config?.bg_color || "#09090b",
    fg_color: initialFooterCfg.theme_config?.fg_color || initialData.theme_config?.fg_color || "#18181b",
    text_color: initialFooterCfg.theme_config?.text_color || initialData.theme_config?.text_color || "#ffffff",
    accent_color: initialFooterCfg.theme_config?.accent_color || initialData.theme_config?.accent_color || "#f59e0b",
    hover_color: initialFooterCfg.theme_config?.hover_color || initialData.theme_config?.hover_color || "#38bdf8",
    link_color: initialFooterCfg.theme_config?.link_color || initialData.theme_config?.link_color || "#f59e0b",
    ...(initialFooterCfg.theme_config || {}),
  });

  // Filter themes that have header or footer components
  const headerThemes = activeThemes.filter(
    (t) =>
      t.components &&
      t.components.some(
        (c: any) => c.component_type === "header" && c.is_active !== false,
      ),
  );
  const footerThemes = activeThemes.filter(
    (t) =>
      t.components &&
      t.components.some(
        (c: any) => c.component_type === "footer" && c.is_active !== false,
      ),
  );

  const selectedHeaderTheme = activeThemes.find(
    (t) => String(t.id) === headerThemeId,
  );
  const headerComponents = selectedHeaderTheme
    ? selectedHeaderTheme.components.filter(
        (c: any) => c.component_type === "header" && c.is_active !== false,
      )
    : [];

  const selectedFooterTheme = activeThemes.find(
    (t) => String(t.id) === footerThemeId,
  );
  const footerComponents = selectedFooterTheme
    ? selectedFooterTheme.components.filter(
        (c: any) => c.component_type === "footer" && c.is_active !== false,
      )
    : [];

  const handleHeaderThemeChange = (newThemeId: string) => {
    setHeaderThemeId(newThemeId);
    if (!newThemeId) {
      setHeaderComponentId("");
      return;
    }
    const th = activeThemes.find((t) => String(t.id) === newThemeId);
    const firstComp = th?.components.find(
      (c: any) => c.component_type === "header" && c.is_active !== false,
    );
    if (firstComp) {
      setHeaderComponentId(String(firstComp.id));
      const cfg = (firstComp.theme_config ?? {}) as Record<string, any>;
      setHeaderColors({
        bg_color: cfg.bg_color || globalColors.bg_color || "#09090b",
        fg_color: cfg.fg_color || globalColors.fg_color || "#18181b",
        text_color: cfg.text_color || globalColors.text_color || "#ffffff",
        accent_color: cfg.accent_color || globalColors.accent_color || "#f59e0b",
        hover_color: cfg.hover_color || globalColors.hover_color || "#38bdf8",
        link_color: cfg.link_color || globalColors.link_color || "#f59e0b",
      });
    }
  };

  const handleHeaderComponentChange = (newCompId: string) => {
    setHeaderComponentId(newCompId);
    const comp = headerComponents.find((c: any) => String(c.id) === newCompId);
    if (comp) {
      const cfg = (comp.theme_config ?? {}) as Record<string, any>;
      setHeaderColors({
        bg_color: cfg.bg_color || globalColors.bg_color || "#09090b",
        fg_color: cfg.fg_color || globalColors.fg_color || "#18181b",
        text_color: cfg.text_color || globalColors.text_color || "#ffffff",
        accent_color: cfg.accent_color || globalColors.accent_color || "#f59e0b",
        hover_color: cfg.hover_color || globalColors.hover_color || "#38bdf8",
        link_color: cfg.link_color || globalColors.link_color || "#f59e0b",
      });
    }
  };

  const handleFooterThemeChange = (newThemeId: string) => {
    setFooterThemeId(newThemeId);
    if (!newThemeId) {
      setFooterComponentId("");
      return;
    }
    const th = activeThemes.find((t) => String(t.id) === newThemeId);
    const firstComp = th?.components.find(
      (c: any) => c.component_type === "footer" && c.is_active !== false,
    );
    if (firstComp) {
      setFooterComponentId(String(firstComp.id));
      const cfg = (firstComp.theme_config ?? {}) as Record<string, any>;
      setFooterColors({
        bg_color: cfg.bg_color || globalColors.bg_color || "#09090b",
        fg_color: cfg.fg_color || globalColors.fg_color || "#18181b",
        text_color: cfg.text_color || globalColors.text_color || "#ffffff",
        accent_color: cfg.accent_color || globalColors.accent_color || "#f59e0b",
        hover_color: cfg.hover_color || globalColors.hover_color || "#38bdf8",
        link_color: cfg.link_color || globalColors.link_color || "#f59e0b",
      });
    }
  };

  const handleFooterComponentChange = (newCompId: string) => {
    setFooterComponentId(newCompId);
    const comp = footerComponents.find((c: any) => String(c.id) === newCompId);
    if (comp) {
      const cfg = (comp.theme_config ?? {}) as Record<string, any>;
      setFooterColors({
        bg_color: cfg.bg_color || globalColors.bg_color || "#09090b",
        fg_color: cfg.fg_color || globalColors.fg_color || "#18181b",
        text_color: cfg.text_color || globalColors.text_color || "#ffffff",
        accent_color: cfg.accent_color || globalColors.accent_color || "#f59e0b",
        hover_color: cfg.hover_color || globalColors.hover_color || "#38bdf8",
        link_color: cfg.link_color || globalColors.link_color || "#f59e0b",
      });
    }
  };

  const handleRevalidateSitemap = () => {
    setIsRevalidatingSitemap(true);
    startTransition(async () => {
      try {
        const res = await revalidateSitemapAction();
        if (res.success) {
          toast(
            res.message || "Sitemap cache revalidated successfully!",
            "success",
          );
        } else {
          toast(res.message || "Failed to revalidate sitemap.", "error");
        }
      } catch (err) {
        toast(
          "An unexpected error occurred while revalidating sitemap.",
          "error",
        );
      } finally {
        setIsRevalidatingSitemap(false);
      }
    });
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(siteConfigUpdateSchema),
    defaultValues: {
      name: initialData.name || "",
      tagline: initialData.tagline || "",
      description: initialData.description || "",
      site_url: initialData.site_url || "",
      topbar_message: initialData.topbar_message || "",
      light_logo_url: initialData.light_logo_url || "",
      dark_logo_url: initialData.dark_logo_url || "",
      favicon_url: initialData.favicon_url || "",
      font_family: initialData.font_family || "Inter",
      custom_css: initialData.custom_css || "",
      currency: initialData.currency || "USD",
      currency_symbol: initialData.currency_symbol || "$",
      email: initialData.email || "",
      phone: initialData.phone || "",
      address: initialData.address || "",
      social_links: {
        twitter: initialData.social_links?.twitter || "",
        instagram: initialData.social_links?.instagram || "",
        facebook: initialData.social_links?.facebook || "",
        youtube: initialData.social_links?.youtube || "",
        tiktok: initialData.social_links?.tiktok || "",
      },
      business_name: initialData.business_name || "",
      business_registration_number:
        initialData.business_registration_number || "",
      tax_rate: initialData.tax_rate !== undefined ? initialData.tax_rate : "",
      tax_inclusive: initialData.tax_inclusive ?? false,
      tax_label: initialData.tax_label || "Tax",
      require_phone: initialData.require_phone ?? false,
      allow_order_notes: initialData.allow_order_notes ?? true,
      captcha_provider: initialData.captcha_provider || "none",
      meta_info: {
        title: initialData.meta_info?.title || "",
        description: initialData.meta_info?.description || "",
        keywords: initialData.meta_info?.keywords || "",
        og_title: initialData.meta_info?.og_title || "",
        og_description: initialData.meta_info?.og_description || "",
        og_image: initialData.meta_info?.og_image || "",
      },
    },
  });

  const onSubmit = (data: SiteConfigUpdateInput) => {
    if (!permissions.update) {
      toast(
        "You do not have permission to update configuration settings.",
        "error",
      );
      return;
    }

    setGlobalError(null);
    startTransition(async () => {
      // Upload pending images
      if (pendingLightLogo) {
        const formData = new FormData();
        formData.append("file", pendingLightLogo);
        const uploadRes = await uploadMediaImage(formData, "branding");
        if (uploadRes.success && uploadRes.data?.relativePath) {
          data.light_logo_url = uploadRes.data.relativePath;
        } else {
          toast(uploadRes.message || "Failed to upload Light Logo.", "error");
          return;
        }
      }

      if (pendingDarkLogo) {
        const formData = new FormData();
        formData.append("file", pendingDarkLogo);
        const uploadRes = await uploadMediaImage(formData, "branding");
        if (uploadRes.success && uploadRes.data?.relativePath) {
          data.dark_logo_url = uploadRes.data.relativePath;
        } else {
          toast(uploadRes.message || "Failed to upload Dark Logo.", "error");
          return;
        }
      }

      if (pendingFavicon) {
        const formData = new FormData();
        formData.append("file", pendingFavicon);
        const uploadRes = await uploadMediaImage(formData, "branding");
        if (uploadRes.success && uploadRes.data?.relativePath) {
          data.favicon_url = uploadRes.data.relativePath;
        } else {
          toast(uploadRes.message || "Failed to upload Favicon.", "error");
          return;
        }
      }

      // Build theme_config, header_config, footer_config
      const theme_config = globalColors;

      const selectedHComp = headerComponents.find(
        (c: any) => String(c.id) === headerComponentId,
      );
      const header_config =
        headerThemeId && selectedHComp
          ? {
              theme_id: Number(headerThemeId),
              component_id: Number(headerComponentId),
              theme_name: selectedHeaderTheme?.name,
              component_path: selectedHComp.file_path,
              theme_config: headerColors,
            }
          : {};

      const selectedFComp = footerComponents.find(
        (c: any) => String(c.id) === footerComponentId,
      );
      const footer_config =
        footerThemeId && selectedFComp
          ? {
              theme_id: Number(footerThemeId),
              component_id: Number(footerComponentId),
              theme_name: selectedFooterTheme?.name,
              component_path: selectedFComp.file_path,
              theme_config: footerColors,
            }
          : {};

      const payload: SiteConfigUpdateInput = {
        ...data,
        theme_config,
        header_config,
        footer_config,
      };

      try {
        const res = await updateSiteConfig(initialData.id || 1, payload);
        if (res.success) {
          toast(
            res.message || "Configuration updated successfully!",
            "success",
          );
          setPendingLightLogo(null);
          setPendingDarkLogo(null);
          setPendingFavicon(null);
          reset(data);
        } else {
          toast(res.message || "Failed to update configuration.", "error");
          setGlobalError(res.message || "Failed to update configuration.");
        }
      } catch (err) {
        toast(
          "An unexpected error occurred while saving configuration.",
          "error",
        );
        setGlobalError("An unexpected error occurred.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {globalError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
          {globalError}
        </div>
      )}

      {/* Top action header for form */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl gap-4">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {isDirty
              ? "Unsaved changes detected"
              : "Configuration is up to date"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            disabled={!isDirty || isPending}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              isDirty && !isPending
                ? "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800"
                : "text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-transparent"
            }`}
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={isPending || !permissions.update}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-md ${
              permissions.update && !isPending
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10 active:scale-[0.98]"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed shadow-none"
            }`}
          >
            {isPending ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving Changes...
              </>
            ) : (
              "Save All Changes"
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2 overflow-x-auto pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-300"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
      {/* TAB 1: General & Branding */}
      {activeTab === "general" && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-6 shadow-sm">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            General Identity & Branding
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Store Name *
              </label>
              <input
                {...register("name")}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.name && (
                <p className="text-xs text-rose-500 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Tagline
              </label>
              <input
                {...register("tagline")}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Site URL
              </label>
              <input
                {...register("site_url")}
                placeholder="https://example.com"
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Topbar Announcement Message
              </label>
              <input
                {...register("topbar_message")}
                placeholder="e.g. Free shipping on orders over $50"
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Store Description
            </label>
            <textarea
              {...register("description")}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Logo uploads */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
            <ImageInputGroup
              title="Logos & Brand Icons"
              description="Upload and optimize brand logos and browser favicon."
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ImageInput
                  label="Light Theme Logo"
                  value={initialData.light_logo_url || ""}
                  file={pendingLightLogo}
                  onFileSelect={(f) => setPendingLightLogo(f)}
                  uploadFolder="branding"
                  showAltField={false}
                />
                <ImageInput
                  label="Dark Theme Logo"
                  value={initialData.dark_logo_url || ""}
                  file={pendingDarkLogo}
                  onFileSelect={(f) => setPendingDarkLogo(f)}
                  uploadFolder="branding"
                  showAltField={false}
                />
                <ImageInput
                  label="Favicon Icon"
                  value={initialData.favicon_url || ""}
                  file={pendingFavicon}
                  onFileSelect={(f) => setPendingFavicon(f)}
                  uploadFolder="branding"
                  showAltField={false}
                />
              </div>
            </ImageInputGroup>
          </div>
        </div>
      )}

      {/* TAB 2: Themes & Layout */}
      {activeTab === "theme" && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800">
          {/* Header Component Selection */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Header Component Selection
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Choose whether to use the default system header or a
                  registered theme header component.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Theme Source
                </label>
                <select
                  value={headerThemeId}
                  onChange={(e) => handleHeaderThemeChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none"
                >
                  <option value="">Default System Header</option>
                  {headerThemes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Custom Theme)
                    </option>
                  ))}
                </select>
              </div>

              {headerThemeId && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Header Variant
                  </label>
                  <select
                    value={headerComponentId}
                    onChange={(e) =>
                      handleHeaderComponentChange(e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none"
                  >
                    {headerComponents.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.file_path})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {headerThemeId && (
              <ThemeColorsInput
                title="Header Scoped Colors"
                description="Customize the color palette specifically for the selected header component."
                value={headerColors}
                onChange={setHeaderColors}
                disabled={!permissions.update}
                borderless={true}
              />
            )}
          </div>

          {/* Footer Component Selection */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Footer Component Selection
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Choose whether to use the default system footer or a
                  registered theme footer component.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Theme Source
                </label>
                <select
                  value={footerThemeId}
                  onChange={(e) => handleFooterThemeChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none"
                >
                  <option value="">Default System Footer</option>
                  {footerThemes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Custom Theme)
                    </option>
                  ))}
                </select>
              </div>

              {footerThemeId && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Footer Variant
                  </label>
                  <select
                    value={footerComponentId}
                    onChange={(e) =>
                      handleFooterComponentChange(e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none"
                  >
                    {footerComponents.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.file_path})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {footerThemeId && (
              <ThemeColorsInput
                title="Footer Scoped Colors"
                description="Customize the color palette specifically for the selected footer component."
                value={footerColors}
                onChange={setFooterColors}
                disabled={!permissions.update}
                borderless={true}
              />
            )}
          </div>

          {/* Global Theme Colors */}
          <div className="p-6">
            <ThemeColorsInput
              title="Global Theme Color Palette (JSON)"
              description="These colors define the store-wide baseline and default values for all registered theme components."
              value={globalColors}
              onChange={setGlobalColors}
              disabled={!permissions.update}
              borderless={true}
            />
          </div>

          {/* Typography & Custom CSS */}
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Typography & Custom CSS
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Configure the storefront primary font family and inject custom CSS stylesheet rules.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Primary Font Family
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select
                    {...register("font_family")}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none"
                  >
                    <option value="Inter">Inter (Default)</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Outfit">Outfit</option>
                    <option value="Poppins">Poppins</option>
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                    <option value="Playfair Display">Playfair Display</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="system-ui">System UI (Native OS)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Custom CSS (Injected into Storefront &lt;head&gt;)
                </label>
                <textarea
                  {...register("custom_css")}
                  rows={6}
                  placeholder={`/* Custom CSS injected directly into storefront */\n:root {\n  /* custom variables */\n}`}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-100 dark:bg-zinc-950 outline-none resize-y"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Business & Checkout */}
      {activeTab === "checkout" && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-6 shadow-sm">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Business & Checkout Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Business Legal Name
              </label>
              <input
                {...register("business_name")}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Business Registration / Tax Number
              </label>
              <input
                {...register("business_registration_number")}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Currency ISO Code
              </label>
              <input
                {...register("currency")}
                placeholder="USD"
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Currency Symbol
              </label>
              <input
                {...register("currency_symbol")}
                placeholder="$"
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Tax Rate (0.00 - 1.00)
              </label>
              <input
                type="number"
                step="0.001"
                {...register("tax_rate")}
                placeholder="e.g. 0.05 for 5%"
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tax_inclusive"
                {...register("tax_inclusive")}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700"
              />
              <label
                htmlFor="tax_inclusive"
                className="text-xs font-medium cursor-pointer"
              >
                Prices are Tax Inclusive
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="require_phone"
                {...register("require_phone")}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700"
              />
              <label
                htmlFor="require_phone"
                className="text-xs font-medium cursor-pointer"
              >
                Require Phone Number on Checkout
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allow_order_notes"
                {...register("allow_order_notes")}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700"
              />
              <label
                htmlFor="allow_order_notes"
                className="text-xs font-medium cursor-pointer"
              >
                Allow Customer Order Notes
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Contact & Socials */}
      {activeTab === "contact" && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-6 shadow-sm">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Contact Information & Social Links
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Support Email
              </label>
              <input
                type="email"
                {...register("email")}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Contact Phone
              </label>
              <input
                {...register("phone")}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Store Physical Address
            </label>
            <input
              {...register("address")}
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none"
            />
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Social Media Links
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Instagram URL
                </label>
                <input
                  {...register("social_links.instagram")}
                  placeholder="https://instagram.com/yourstore"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Twitter / X URL
                </label>
                <input
                  {...register("social_links.twitter")}
                  placeholder="https://x.com/yourstore"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Facebook URL
                </label>
                <input
                  {...register("social_links.facebook")}
                  placeholder="https://facebook.com/yourstore"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  YouTube URL
                </label>
                <input
                  {...register("social_links.youtube")}
                  placeholder="https://youtube.com/@yourstore"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Security & SEO */}
      {activeTab === "security" && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="p-6 space-y-6">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Security & Anti-Bot Protection
            </h3>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                CAPTCHA Provider
              </label>
              <select
                {...register("captcha_provider")}
                className="w-full md:w-1/2 px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none"
              >
                <option value="none">Disabled (No CAPTCHA)</option>
                <option value="turnstile">Cloudflare Turnstile</option>
                <option value="recaptcha">Google reCAPTCHA v3</option>
              </select>
            </div>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Dynamic Sitemap
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Revalidates the cache for /sitemap.xml across all products,
                  categories, and site pages.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRevalidateSitemap}
                disabled={isRevalidatingSitemap}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition"
              >
                {isRevalidatingSitemap
                  ? "Revalidating..."
                  : "Revalidate Sitemap"}
              </button>
            </div>
          </div>

          {/* SEO Meta */}
          <div className="p-6">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              Default Store SEO Metadata
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
      )}
    </form>
  );
}
