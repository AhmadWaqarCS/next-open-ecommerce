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
import { setFormErrors } from "@/lib/client-utils";
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

  // Pending image states for staged uploads
  const [pendingLightLogo, setPendingLightLogo] = useState<File | null>(null);
  const [pendingDarkLogo, setPendingDarkLogo] = useState<File | null>(null);
  const [pendingFavicon, setPendingFavicon] = useState<File | null>(null);
  const [pendingOgImage, setPendingOgImage] = useState<File | null>(null);

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
    bg_color:
      initialHeaderCfg.theme_config?.bg_color ||
      initialData.theme_config?.bg_color ||
      "#09090b",
    fg_color:
      initialHeaderCfg.theme_config?.fg_color ||
      initialData.theme_config?.fg_color ||
      "#18181b",
    text_color:
      initialHeaderCfg.theme_config?.text_color ||
      initialData.theme_config?.text_color ||
      "#ffffff",
    accent_color:
      initialHeaderCfg.theme_config?.accent_color ||
      initialData.theme_config?.accent_color ||
      "#f59e0b",
    hover_color:
      initialHeaderCfg.theme_config?.hover_color ||
      initialData.theme_config?.hover_color ||
      "#38bdf8",
    link_color:
      initialHeaderCfg.theme_config?.link_color ||
      initialData.theme_config?.link_color ||
      "#f59e0b",
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
    bg_color:
      initialFooterCfg.theme_config?.bg_color ||
      initialData.theme_config?.bg_color ||
      "#09090b",
    fg_color:
      initialFooterCfg.theme_config?.fg_color ||
      initialData.theme_config?.fg_color ||
      "#18181b",
    text_color:
      initialFooterCfg.theme_config?.text_color ||
      initialData.theme_config?.text_color ||
      "#ffffff",
    accent_color:
      initialFooterCfg.theme_config?.accent_color ||
      initialData.theme_config?.accent_color ||
      "#f59e0b",
    hover_color:
      initialFooterCfg.theme_config?.hover_color ||
      initialData.theme_config?.hover_color ||
      "#38bdf8",
    link_color:
      initialFooterCfg.theme_config?.link_color ||
      initialData.theme_config?.link_color ||
      "#f59e0b",
    ...(initialFooterCfg.theme_config || {}),
  });

  // Filter themes with header or footer components
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
        toast.action(res, "Sitemap cache revalidated successfully!");
      } catch (err) {
        toast.error("An unexpected error occurred while revalidating sitemap.");
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
    setError,
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
      tax_rate:
        initialData.tax_rate !== undefined && initialData.tax_rate !== null
          ? initialData.tax_rate
          : "",
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

  const handleDiscard = () => {
    reset();
    setPendingLightLogo(null);
    setPendingDarkLogo(null);
    setPendingFavicon(null);
    setPendingOgImage(null);
    setGlobalError(null);
  };

  const handleClearAllBrandImages = () => {
    setPendingLightLogo(null);
    setPendingDarkLogo(null);
    setPendingFavicon(null);
    setValue("light_logo_url", "", { shouldDirty: true });
    setValue("dark_logo_url", "", { shouldDirty: true });
    setValue("favicon_url", "", { shouldDirty: true });
  };

  const onSubmit = (data: SiteConfigUpdateInput) => {
    if (!permissions.update) {
      toast.error("You do not have permission to update configuration settings.");
      return;
    }

    setGlobalError(null);
    startTransition(async () => {
      // 1. Upload pending brand and OG images
      if (pendingLightLogo) {
        const formData = new FormData();
        formData.append("file", pendingLightLogo);
        const uploadRes = await uploadMediaImage(formData, "branding");
        if (uploadRes.success && uploadRes.data?.relativePath) {
          data.light_logo_url = uploadRes.data.relativePath;
        } else {
          toast.error(uploadRes.message || "Failed to upload Light Logo.");
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
          toast.error(uploadRes.message || "Failed to upload Dark Logo.");
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
          toast.error(uploadRes.message || "Failed to upload Favicon.");
          return;
        }
      }

      if (pendingOgImage) {
        const formData = new FormData();
        formData.append("file", pendingOgImage);
        const uploadRes = await uploadMediaImage(formData, "seo");
        if (uploadRes.success && uploadRes.data?.relativePath) {
          if (!data.meta_info) data.meta_info = {};
          (data.meta_info as Record<string, any>).og_image = uploadRes.data.relativePath;
        } else {
          toast.error(uploadRes.message || "Failed to upload OpenGraph Image.");
          return;
        }
      }

      // 2. Build theme_config, header_config, footer_config
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
          toast.success(res.message || "Site configuration updated successfully!");
          setPendingLightLogo(null);
          setPendingDarkLogo(null);
          setPendingFavicon(null);
          setPendingOgImage(null);
          reset(data);
        } else {
          toast.error(res.message || "Failed to update configuration.");
          setGlobalError(res.message || "Failed to update configuration.");
          if (res.errors) {
            setFormErrors(res.errors, setError);
          }
        }
      } catch (err) {
        toast.error("An unexpected error occurred while saving configuration.");
        setGlobalError("An unexpected error occurred.");
      }
    });
  };

  const hasDirtyState =
    isDirty ||
    !!pendingLightLogo ||
    !!pendingDarkLogo ||
    !!pendingFavicon ||
    !!pendingOgImage;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Top Header Section with Title & Top-Right Action Buttons (CLIENT-SIDE-FORMS.md compliance) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-dashboard-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-dashboard-fg">
              Site Settings
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                hasDirtyState
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  : "bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent/20"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  hasDirtyState ? "bg-amber-500 animate-pulse" : "bg-dashboard-accent"
                }`}
              />
              {hasDirtyState ? "Unsaved changes" : "Saved"}
            </span>
          </div>
          <p className="text-sm text-dashboard-muted mt-1">
            Configure global store parameters, theme branding, checkout rules, and SEO defaults.
          </p>
        </div>

        {/* Top-Right Action Buttons */}
        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!hasDirtyState || isPending}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              hasDirtyState && !isPending
                ? "text-dashboard-muted hover:text-dashboard-fg hover:bg-dashboard-card-hover border border-dashboard-border"
                : "text-dashboard-muted/50 cursor-not-allowed border border-transparent opacity-50"
            }`}
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={isPending || !permissions.update || !hasDirtyState}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-xs ${
              permissions.update && !isPending && hasDirtyState
                ? "bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg cursor-pointer active:scale-[0.98]"
                : "bg-dashboard-muted-bg text-dashboard-muted cursor-not-allowed opacity-60 shadow-none"
            }`}
          >
            {isPending ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-dashboard-primary-fg"
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
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving Changes...
              </>
            ) : (
              "Save All Changes"
            )}
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {globalError && (
        <div className="p-4 rounded-xl bg-dashboard-danger-subtle border border-dashboard-danger/30 text-dashboard-danger text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{globalError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGlobalError(null)}
            className="text-xs hover:underline cursor-pointer ml-4 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Controls */}
      <div className="flex border-b border-dashboard-border gap-2 overflow-x-auto pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? "border-dashboard-primary text-dashboard-primary bg-dashboard-card shadow-xs"
                : "border-transparent text-dashboard-muted hover:text-dashboard-fg hover:border-dashboard-border"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: General & Branding */}
      {activeTab === "general" && (
        <div className="rounded-2xl border border-dashboard-border bg-dashboard-card p-6 space-y-6 shadow-xs">
          <div className="border-b border-dashboard-border pb-4">
            <h3 className="text-base font-bold text-dashboard-fg">
              General Identity & Branding
            </h3>
            <p className="text-xs text-dashboard-muted mt-0.5">
              Set the foundational store identity, public branding, and announcement messaging.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                Store Name *
              </label>
              <input
                {...register("name")}
                disabled={!permissions.update}
                placeholder="e.g. My Awesome Store"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted outline-none focus:border-dashboard-primary transition-all disabled:opacity-50"
              />
              {errors.name && (
                <p className="text-xs text-dashboard-danger mt-1 font-medium">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                Store Tagline
              </label>
              <input
                {...register("tagline")}
                disabled={!permissions.update}
                placeholder="e.g. Premium goods delivered to your doorstep"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted outline-none focus:border-dashboard-primary transition-all disabled:opacity-50"
              />
              {errors.tagline && (
                <p className="text-xs text-dashboard-danger mt-1 font-medium">
                  {errors.tagline.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                Public Storefront URL
              </label>
              <input
                {...register("site_url")}
                disabled={!permissions.update}
                placeholder="https://example.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted outline-none focus:border-dashboard-primary transition-all disabled:opacity-50"
              />
              {errors.site_url && (
                <p className="text-xs text-dashboard-danger mt-1 font-medium">
                  {errors.site_url.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                Topbar Announcement Message
              </label>
              <input
                {...register("topbar_message")}
                disabled={!permissions.update}
                placeholder="e.g. Free worldwide shipping on all orders over $75"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted outline-none focus:border-dashboard-primary transition-all disabled:opacity-50"
              />
              {errors.topbar_message && (
                <p className="text-xs text-dashboard-danger mt-1 font-medium">
                  {errors.topbar_message.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
              Store Description
            </label>
            <textarea
              {...register("description")}
              disabled={!permissions.update}
              rows={3}
              placeholder="Provide a concise description of your store and mission."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted outline-none focus:border-dashboard-primary resize-none transition-all disabled:opacity-50"
            />
            {errors.description && (
              <p className="text-xs text-dashboard-danger mt-1 font-medium">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Logo & Brand Icons (IMAGE-INPUT.md specification) */}
          <div className="pt-4 border-t border-dashboard-border">
            <ImageInputGroup
              title="Logos & Brand Icons"
              description="Upload and optimize your light theme logo, dark theme logo, and browser favicon icon."
              layout="grid"
              fixed={true}
              onClearAll={handleClearAllBrandImages}
            >
              <ImageInput
                label="Light Theme Logo"
                value={watch("light_logo_url") || ""}
                file={pendingLightLogo}
                onFileSelect={(f) => setPendingLightLogo(f)}
                onRemove={() => {
                  setPendingLightLogo(null);
                  setValue("light_logo_url", "", { shouldDirty: true });
                }}
                disabled={!permissions.update}
                uploadFolder="branding"
                showAltField={false}
              />
              <ImageInput
                label="Dark Theme Logo"
                value={watch("dark_logo_url") || ""}
                file={pendingDarkLogo}
                onFileSelect={(f) => setPendingDarkLogo(f)}
                onRemove={() => {
                  setPendingDarkLogo(null);
                  setValue("dark_logo_url", "", { shouldDirty: true });
                }}
                disabled={!permissions.update}
                uploadFolder="branding"
                showAltField={false}
              />
              <ImageInput
                label="Favicon Icon"
                value={watch("favicon_url") || ""}
                file={pendingFavicon}
                onFileSelect={(f) => setPendingFavicon(f)}
                onRemove={() => {
                  setPendingFavicon(null);
                  setValue("favicon_url", "", { shouldDirty: true });
                }}
                disabled={!permissions.update}
                uploadFolder="branding"
                showAltField={false}
              />
            </ImageInputGroup>
          </div>
        </div>
      )}

      {/* TAB 2: Themes & Layout */}
      {activeTab === "theme" && (
        <div className="rounded-2xl border border-dashboard-border bg-dashboard-card shadow-xs divide-y divide-dashboard-border">
          {/* Header Component Selection */}
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-dashboard-fg">
                Header Component Selection
              </h3>
              <p className="text-xs text-dashboard-muted mt-0.5">
                Choose whether to render the system default storefront header or a theme-scoped navigation component.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                  Theme Source
                </label>
                <select
                  value={headerThemeId}
                  disabled={!permissions.update}
                  onChange={(e) => handleHeaderThemeChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg outline-none focus:border-dashboard-primary disabled:opacity-50"
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
                  <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                    Header Variant
                  </label>
                  <select
                    value={headerComponentId}
                    disabled={!permissions.update}
                    onChange={(e) => handleHeaderComponentChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg outline-none focus:border-dashboard-primary disabled:opacity-50"
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
                description="Customize the color palette applied specifically to the selected header navigation component."
                value={headerColors}
                onChange={setHeaderColors}
                disabled={!permissions.update}
                borderless={true}
              />
            )}
          </div>

          {/* Footer Component Selection */}
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-dashboard-fg">
                Footer Component Selection
              </h3>
              <p className="text-xs text-dashboard-muted mt-0.5">
                Choose whether to render the system default storefront footer or a registered theme footer component.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                  Theme Source
                </label>
                <select
                  value={footerThemeId}
                  disabled={!permissions.update}
                  onChange={(e) => handleFooterThemeChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg outline-none focus:border-dashboard-primary disabled:opacity-50"
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
                  <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                    Footer Variant
                  </label>
                  <select
                    value={footerComponentId}
                    disabled={!permissions.update}
                    onChange={(e) => handleFooterComponentChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg outline-none focus:border-dashboard-primary disabled:opacity-50"
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
                description="Customize the color palette applied specifically to the selected footer component."
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
              title="Global Theme Color Palette"
              description="These semantic colors define the baseline storefront theme and fallback values across all components."
              value={globalColors}
              onChange={setGlobalColors}
              disabled={!permissions.update}
              borderless={true}
            />
          </div>

          {/* Typography & Custom CSS */}
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-dashboard-fg">
                Typography & Custom CSS
              </h3>
              <p className="text-xs text-dashboard-muted mt-0.5">
                Configure the primary storefront typography font and inject custom CSS rules.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                  Primary Store Font Family
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select
                    {...register("font_family")}
                    disabled={!permissions.update}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg outline-none focus:border-dashboard-primary disabled:opacity-50"
                  >
                    <option value="Inter">Inter (Default Modern Sans)</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Outfit">Outfit (Clean Geometric)</option>
                    <option value="Poppins">Poppins</option>
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                    <option value="Playfair Display">Playfair Display (Editorial Serif)</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="system-ui">System UI (Native OS Font)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                  Custom CSS (Injected into Storefront &lt;head&gt;)
                </label>
                <textarea
                  {...register("custom_css")}
                  disabled={!permissions.update}
                  rows={6}
                  placeholder={`/* Custom storefront CSS declarations */\n:root {\n  /* custom variables */\n}`}
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg outline-none focus:border-dashboard-primary resize-y disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Business & Checkout */}
      {activeTab === "checkout" && (
        <div className="rounded-2xl border border-dashboard-border bg-dashboard-card p-6 space-y-6 shadow-xs">
          <div className="border-b border-dashboard-border pb-4">
            <h3 className="text-base font-bold text-dashboard-fg">
              Business & Checkout Settings
            </h3>
            <p className="text-xs text-dashboard-muted mt-0.5">
              Configure business registration details, currency, taxation rules, and checkout requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                Business Legal Entity Name
              </label>
              <input
                {...register("business_name")}
                disabled={!permissions.update}
                placeholder="e.g. Acme Corporation LLC"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted outline-none focus:border-dashboard-primary disabled:opacity-50"
              />
              {errors.business_name && (
                <p className="text-xs text-dashboard-danger mt-1 font-medium">
                  {errors.business_name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                Business Registration / Tax Number
              </label>
              <input
                {...register("business_registration_number")}
                disabled={!permissions.update}
                placeholder="e.g. EIN-123456789 or VAT-GB123456"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted outline-none focus:border-dashboard-primary disabled:opacity-50"
              />
              {errors.business_registration_number && (
                <p className="text-xs text-dashboard-danger mt-1 font-medium">
                  {errors.business_registration_number.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                Currency ISO Code *
              </label>
              <input
                {...register("currency")}
                disabled={!permissions.update}
                placeholder="USD"
                maxLength={3}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg uppercase font-mono outline-none focus:border-dashboard-primary disabled:opacity-50"
              />
              {errors.currency && (
                <p className="text-xs text-dashboard-danger mt-1 font-medium">
                  {errors.currency.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                Currency Symbol *
              </label>
              <input
                {...register("currency_symbol")}
                disabled={!permissions.update}
                placeholder="$"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg font-mono outline-none focus:border-dashboard-primary disabled:opacity-50"
              />
              {errors.currency_symbol && (
                <p className="text-xs text-dashboard-danger mt-1 font-medium">
                  {errors.currency_symbol.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                Tax Rate (0.00 - 1.00)
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                max="1"
                {...register("tax_rate")}
                disabled={!permissions.update}
                placeholder="e.g. 0.05 for 5%"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg outline-none focus:border-dashboard-primary disabled:opacity-50"
              />
              {errors.tax_rate && (
                <p className="text-xs text-dashboard-danger mt-1 font-medium">
                  {errors.tax_rate.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                Tax Label (Displayed to Customer)
              </label>
              <input
                {...register("tax_label")}
                disabled={!permissions.update}
                placeholder="e.g. VAT, GST, Tax"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg outline-none focus:border-dashboard-primary disabled:opacity-50"
              />
              {errors.tax_label && (
                <p className="text-xs text-dashboard-danger mt-1 font-medium">
                  {errors.tax_label.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-dashboard-border">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-dashboard-border bg-dashboard-muted-bg/50 cursor-pointer hover:bg-dashboard-card-hover transition-colors">
              <input
                type="checkbox"
                id="tax_inclusive"
                disabled={!permissions.update}
                {...register("tax_inclusive")}
                className="h-4 w-4 rounded text-dashboard-primary focus:ring-dashboard-primary border-dashboard-border"
              />
              <span className="text-xs font-semibold text-dashboard-fg">
                Prices are Tax Inclusive
              </span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-dashboard-border bg-dashboard-muted-bg/50 cursor-pointer hover:bg-dashboard-card-hover transition-colors">
              <input
                type="checkbox"
                id="require_phone"
                disabled={!permissions.update}
                {...register("require_phone")}
                className="h-4 w-4 rounded text-dashboard-primary focus:ring-dashboard-primary border-dashboard-border"
              />
              <span className="text-xs font-semibold text-dashboard-fg">
                Require Phone on Checkout
              </span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-dashboard-border bg-dashboard-muted-bg/50 cursor-pointer hover:bg-dashboard-card-hover transition-colors">
              <input
                type="checkbox"
                id="allow_order_notes"
                disabled={!permissions.update}
                {...register("allow_order_notes")}
                className="h-4 w-4 rounded text-dashboard-primary focus:ring-dashboard-primary border-dashboard-border"
              />
              <span className="text-xs font-semibold text-dashboard-fg">
                Allow Customer Order Notes
              </span>
            </label>
          </div>
        </div>
      )}

      {/* TAB 4: Contact & Socials */}
      {activeTab === "contact" && (
        <div className="rounded-2xl border border-dashboard-border bg-dashboard-card p-6 space-y-6 shadow-xs">
          <div className="border-b border-dashboard-border pb-4">
            <h3 className="text-base font-bold text-dashboard-fg">
              Contact Information & Social Links
            </h3>
            <p className="text-xs text-dashboard-muted mt-0.5">
              Contact channels and social profiles displayed in your storefront footer and transactional emails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                Support Email Address
              </label>
              <input
                type="email"
                {...register("email")}
                disabled={!permissions.update}
                placeholder="support@example.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted outline-none focus:border-dashboard-primary disabled:opacity-50"
              />
              {errors.email && (
                <p className="text-xs text-dashboard-danger mt-1 font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                Contact Phone Number
              </label>
              <input
                {...register("phone")}
                disabled={!permissions.update}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted outline-none focus:border-dashboard-primary disabled:opacity-50"
              />
              {errors.phone && (
                <p className="text-xs text-dashboard-danger mt-1 font-medium">
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
              Store Physical Headquarters Address
            </label>
            <input
              {...register("address")}
              disabled={!permissions.update}
              placeholder="123 Commerce Way, Suite 100, City, Country"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted outline-none focus:border-dashboard-primary disabled:opacity-50"
            />
            {errors.address && (
              <p className="text-xs text-dashboard-danger mt-1 font-medium">
                {errors.address.message}
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-dashboard-border space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-dashboard-muted">
              Official Social Media Profiles
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                  Instagram URL
                </label>
                <input
                  {...register("social_links.instagram")}
                  disabled={!permissions.update}
                  placeholder="https://instagram.com/yourstore"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted outline-none focus:border-dashboard-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                  Twitter / X URL
                </label>
                <input
                  {...register("social_links.twitter")}
                  disabled={!permissions.update}
                  placeholder="https://x.com/yourstore"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted outline-none focus:border-dashboard-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                  Facebook URL
                </label>
                <input
                  {...register("social_links.facebook")}
                  disabled={!permissions.update}
                  placeholder="https://facebook.com/yourstore"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted outline-none focus:border-dashboard-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                  YouTube URL
                </label>
                <input
                  {...register("social_links.youtube")}
                  disabled={!permissions.update}
                  placeholder="https://youtube.com/@yourstore"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted outline-none focus:border-dashboard-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                  TikTok URL
                </label>
                <input
                  {...register("social_links.tiktok")}
                  disabled={!permissions.update}
                  placeholder="https://tiktok.com/@yourstore"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted outline-none focus:border-dashboard-primary disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Security & SEO */}
      {activeTab === "security" && (
        <div className="rounded-2xl border border-dashboard-border bg-dashboard-card shadow-xs divide-y divide-dashboard-border">
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-dashboard-fg">
                Security & Anti-Bot Protection
              </h3>
              <p className="text-xs text-dashboard-muted mt-0.5">
                Enable challenge verification on customer checkout and registration forms.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dashboard-fg mb-1.5">
                CAPTCHA Verification Provider
              </label>
              <select
                {...register("captcha_provider")}
                disabled={!permissions.update}
                className="w-full md:w-1/2 px-3.5 py-2.5 text-sm rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg outline-none focus:border-dashboard-primary disabled:opacity-50"
              >
                <option value="none">Disabled (No CAPTCHA Check)</option>
                <option value="turnstile">Cloudflare Turnstile (Recommended)</option>
                <option value="recaptcha">Google reCAPTCHA v3</option>
              </select>
            </div>

            <div className="pt-4 border-t border-dashboard-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-dashboard-fg">
                  Dynamic Storefront Sitemap
                </h4>
                <p className="text-xs text-dashboard-muted mt-0.5">
                  Revalidate and purge cache for /sitemap.xml across all published products, categories, and content pages.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRevalidateSitemap}
                disabled={isRevalidatingSitemap || !permissions.update}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-dashboard-border bg-dashboard-muted-bg hover:bg-dashboard-card-hover text-dashboard-fg disabled:opacity-50 transition cursor-pointer self-start sm:self-auto"
              >
                {isRevalidatingSitemap ? "Revalidating..." : "Revalidate Sitemap Cache"}
              </button>
            </div>
          </div>

          {/* SEO Meta (META-INPUT.md specification) */}
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-base font-bold text-dashboard-fg">
                Default Storefront SEO Metadata
              </h3>
              <p className="text-xs text-dashboard-muted mt-0.5">
                These tags configure the baseline search engine listing and OpenGraph share card preview for your homepage.
              </p>
            </div>
            <MetaInput
              register={register}
              watch={watch}
              setValue={setValue}
              errors={errors}
              disabled={!permissions.update}
              prefix="meta_info"
              uploadFolder="seo"
              defaultTitle={watch("name")}
              defaultDescription={watch("description")}
              onOgImageFileSelect={setPendingOgImage}
              pendingOgImageFile={pendingOgImage}
            />
          </div>
        </div>
      )}
    </form>
  );
}
