"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "../../_components/toast-context";
import { updateSiteConfig, generateSitemapAction } from "@/actions/site-actions";
import { uploadMediaImage } from "@/actions/media-actions";
import {
  SiteConfigUpdateInput,
  siteConfigUpdateSchema,
} from "@/lib/validations";
import { CRUD } from "@/lib/types";
import ImageField from "../../_components/image-field";

interface SiteConfigFormProps {
  initialData: any;
  permissions: CRUD;
}

const TABS = [
  { id: "general", label: "General & Hero", icon: "🌐" },
  { id: "style", label: "Branding & Style", icon: "🎨" },
  { id: "checkout", label: "Business & Checkout", icon: "💳" },
  { id: "seo", label: "SEO & Socials", icon: "🔍" },
];

export default function SiteConfigForm({
  initialData,
  permissions,
}: SiteConfigFormProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  const [pendingLightLogo, setPendingLightLogo] = useState<File | null>(null);
  const [pendingDarkLogo, setPendingDarkLogo] = useState<File | null>(null);
  const [pendingFavicon, setPendingFavicon] = useState<File | null>(null);

  const [isGeneratingSitemap, setIsGeneratingSitemap] = useState(false);
  const [sitemapStats, setSitemapStats] = useState({
    lastGenerated: initialData.meta_info?.sitemap_last_generated || null,
    urlCount: initialData.meta_info?.sitemap_url_count || null,
  });

  const handleGenerateSitemap = () => {
    setIsGeneratingSitemap(true);
    startTransition(async () => {
      try {
        const res = await generateSitemapAction();
        if (res.success) {
          toast(res.message || "Sitemap generated successfully!", "success");
          const countMatch = res.message?.match(/(\d+)\s+URLs/);
          setSitemapStats({
            lastGenerated: new Date().toISOString(),
            urlCount: countMatch ? parseInt(countMatch[1]) : null,
          });
        } else {
          toast(res.message || "Failed to generate sitemap.", "error");
        }
      } catch (err) {
        toast("An unexpected error occurred while generating sitemap.", "error");
      } finally {
        setIsGeneratingSitemap(false);
      }
    });
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
    reset,
  } = useForm({
    resolver: zodResolver(siteConfigUpdateSchema),
    defaultValues: {
      name: initialData.name || "",
      tagline: initialData.tagline || "",
      description: initialData.description || "",
      site_url: initialData.site_url || "",
      topbar_message: initialData.topbar_message || "",
      home_tagline_label: initialData.home_tagline_label || "",
      light_logo_url: initialData.light_logo_url || "",
      dark_logo_url: initialData.dark_logo_url || "",
      favicon_url: initialData.favicon_url || "",
      primary_color: initialData.primary_color || "#18181b",
      secondary_color: initialData.secondary_color || "#27272a",
      accent_color: initialData.accent_color || "#f59e0b",
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
      meta_info: {
        title: initialData.meta_info?.title || "",
        description: initialData.meta_info?.description || "",
        keywords: initialData.meta_info?.keywords || "",
        og_title: initialData.meta_info?.og_title || "",
        og_description: initialData.meta_info?.og_description || "",
        og_image: initialData.meta_info?.og_image || "",
        twitter_card: initialData.meta_info?.twitter_card || "",
        twitter_title: initialData.meta_info?.twitter_title || "",
        twitter_description: initialData.meta_info?.twitter_description || "",
        twitter_image: initialData.meta_info?.twitter_image || "",
      },
    },
  });

  // Watch color and branding image values
  const primaryColor = watch("primary_color");
  const secondaryColor = watch("secondary_color");
  const accentColor = watch("accent_color");
  const lightLogoValue = watch("light_logo_url");
  const darkLogoValue = watch("dark_logo_url");
  const faviconValue = watch("favicon_url");

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
      // Upload staged images ONLY when the form is submitted
      if (pendingLightLogo) {
        const formData = new FormData();
        formData.append("file", pendingLightLogo);
        const uploadRes = await uploadMediaImage(formData, "branding");
        if (uploadRes.success && uploadRes.data?.relativePath) {
          data.light_logo_url = uploadRes.data.relativePath;
        } else {
          toast(uploadRes.message || "Failed to upload Light Logo.", "error");
          setGlobalError(uploadRes.message || "Failed to upload Light Logo.");
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
          setGlobalError(uploadRes.message || "Failed to upload Dark Logo.");
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
          setGlobalError(uploadRes.message || "Failed to upload Favicon.");
          return;
        }
      }

      const response = await updateSiteConfig(initialData.id, data);
      if (!response.success) {
        if (response.message) setGlobalError(response.message);
        toast(response.message || "Failed to update configuration.", "error");
        return;
      }

      setPendingLightLogo(null);
      setPendingDarkLogo(null);
      setPendingFavicon(null);

      // Reset dirty state to new values
      reset(data);
      toast("Configuration updated successfully.", "success");
    });
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Top action header for form */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl gap-4">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">
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
            disabled={!isDirty || isPending || !permissions.update}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-md ${
              isDirty && permissions.update
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
              "Save Configuration"
            )}
          </button>
        </div>
      </div>

      {globalError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 font-medium"
        >
          {globalError}
        </div>
      )}

      {hasErrors && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400 font-medium"
        >
          Please check the form tabs for validation errors.
        </div>
      )}

      {/* Sub Horizontal Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Contents Panel */}
      <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs min-h-[450px]">
          {/* TAB 1: GENERAL */}
          {activeTab === "general" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Store Profile
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Basic identification details for your online store.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Store Name *
                  </label>
                  <input
                    type="text"
                    disabled={!permissions.update}
                    {...register("name")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm"
                    placeholder="Luma Store"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-500 font-medium">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Store Tagline
                  </label>
                  <input
                    type="text"
                    disabled={!permissions.update}
                    {...register("tagline")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm"
                    placeholder="Wear what you love."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Site URL
                  </label>
                  <input
                    type="text"
                    disabled={!permissions.update}
                    {...register("site_url")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm"
                    placeholder="https://luma.store"
                  />
                  {errors.site_url && (
                    <p className="mt-1 text-xs text-red-500 font-medium">
                      {errors.site_url.message}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Store Description
                  </label>
                  <textarea
                    disabled={!permissions.update}
                    rows={3}
                    {...register("description")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm"
                    placeholder="Tell your customers about your store..."
                  />
                </div>
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Header & Hero Options
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Settings directly controlling storefront dynamic sections.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      Topbar Promo Message
                    </label>
                    <input
                      type="text"
                      disabled={!permissions.update}
                      {...register("topbar_message")}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm"
                      placeholder="Free shipping on orders over $75 · Use code WELCOME10 for 10% off"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      Home Hero Tagline Label
                    </label>
                    <input
                      type="text"
                      disabled={!permissions.update}
                      {...register("home_tagline_label")}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm"
                      placeholder="Summer Collection 2025"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BRANDING & STYLE */}
          {activeTab === "style" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Logos & Assets
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Specify public URLs for storefront branding images.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <ImageField
                  label="Light Logo"
                  value={lightLogoValue || ""}
                  onChange={(url) =>
                    setValue("light_logo_url", url, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  pendingFile={pendingLightLogo}
                  onFileSelect={setPendingLightLogo}
                  error={errors.light_logo_url?.message}
                  disabled={!permissions.update}
                  uploadFolder="branding"
                  showAltField={false}
                />

                <ImageField
                  label="Dark Logo"
                  value={darkLogoValue || ""}
                  onChange={(url) =>
                    setValue("dark_logo_url", url, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  pendingFile={pendingDarkLogo}
                  onFileSelect={setPendingDarkLogo}
                  error={errors.dark_logo_url?.message}
                  disabled={!permissions.update}
                  uploadFolder="branding"
                  showAltField={false}
                />

                <ImageField
                  label="Favicon"
                  value={faviconValue || ""}
                  onChange={(url) =>
                    setValue("favicon_url", url, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  pendingFile={pendingFavicon}
                  onFileSelect={setPendingFavicon}
                  error={errors.favicon_url?.message}
                  disabled={!permissions.update}
                  uploadFolder="branding"
                  showAltField={false}
                />
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Color Palette
                  </h3>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 font-semibold mb-2">
                    Note: Color Hex values must be valid formats starting with #
                    (e.g. #0f0f0f).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Primary Color */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Primary Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        disabled={!permissions.update}
                        value={primaryColor || "#18181b"}
                        onChange={(e) =>
                          setValue("primary_color", e.target.value, {
                            shouldDirty: true,
                          })
                        }
                        className="h-10 w-10 rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer p-1"
                      />
                      <input
                        type="text"
                        disabled={!permissions.update}
                        {...register("primary_color")}
                        className="flex-1 px-3.5 py-2 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none text-sm font-mono"
                      />
                    </div>
                    {errors.primary_color && (
                      <p className="mt-1 text-xs text-red-500 font-medium">
                        {errors.primary_color.message}
                      </p>
                    )}
                  </div>

                  {/* Secondary Color */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Secondary Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        disabled={!permissions.update}
                        value={secondaryColor || "#27272a"}
                        onChange={(e) =>
                          setValue("secondary_color", e.target.value, {
                            shouldDirty: true,
                          })
                        }
                        className="h-10 w-10 rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer p-1"
                      />
                      <input
                        type="text"
                        disabled={!permissions.update}
                        {...register("secondary_color")}
                        className="flex-1 px-3.5 py-2 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none text-sm font-mono"
                      />
                    </div>
                    {errors.secondary_color && (
                      <p className="mt-1 text-xs text-red-500 font-medium">
                        {errors.secondary_color.message}
                      </p>
                    )}
                  </div>

                  {/* Accent Color */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Accent Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        disabled={!permissions.update}
                        value={accentColor || "#f59e0b"}
                        onChange={(e) =>
                          setValue("accent_color", e.target.value, {
                            shouldDirty: true,
                          })
                        }
                        className="h-10 w-10 rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer p-1"
                      />
                      <input
                        type="text"
                        disabled={!permissions.update}
                        {...register("accent_color")}
                        className="flex-1 px-3.5 py-2 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none text-sm font-mono"
                      />
                    </div>
                    {errors.accent_color && (
                      <p className="mt-1 text-xs text-red-500 font-medium">
                        {errors.accent_color.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* TAB 4: BUSINESS & CHECKOUT */}
          {activeTab === "checkout" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Business Identity
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Legal business settings for invoices and compliance.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Business Name
                  </label>
                  <input
                    type="text"
                    disabled={!permissions.update}
                    {...register("business_name")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm"
                    placeholder="Luma Fashion Inc."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Business Registration / Tax ID
                  </label>
                  <input
                    type="text"
                    disabled={!permissions.update}
                    {...register("business_registration_number")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm"
                    placeholder="NTN-1234567-8"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Tax Rate (e.g. 0.0825 for 8.25%)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    disabled={!permissions.update}
                    {...register("tax_rate")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm"
                    placeholder="0.0825"
                  />
                  {errors.tax_rate && (
                    <p className="mt-1 text-xs text-red-500 font-medium">
                      {errors.tax_rate.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Tax Label
                  </label>
                  <input
                    type="text"
                    disabled={!permissions.update}
                    {...register("tax_label")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none text-sm"
                    placeholder="GST / VAT"
                  />
                </div>

                <div className="flex items-center gap-2.5 py-2 md:col-span-2">
                  <input
                    type="checkbox"
                    id="tax_inclusive"
                    disabled={!permissions.update}
                    {...register("tax_inclusive")}
                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500/10 cursor-pointer"
                  />
                  <label
                    htmlFor="tax_inclusive"
                    className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
                  >
                    Prices include tax (tax inclusive)
                  </label>
                </div>
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Checkout Settings
                  </h3>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 font-semibold">
                    Tweak user fields and Cash on Delivery features.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-2.5 py-1">
                    <input
                      type="checkbox"
                      id="require_phone"
                      disabled={!permissions.update}
                      {...register("require_phone")}
                      className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500/10 cursor-pointer"
                    />
                    <label
                      htmlFor="require_phone"
                      className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
                    >
                      Require phone number at checkout
                    </label>
                  </div>

                  <div className="flex items-center gap-2.5 py-1">
                    <input
                      type="checkbox"
                      id="allow_order_notes"
                      disabled={!permissions.update}
                      {...register("allow_order_notes")}
                      className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500/10 cursor-pointer"
                    />
                    <label
                      htmlFor="allow_order_notes"
                      className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
                    >
                      Allow customers to add custom notes
                    </label>
                  </div>

                  <div className="border-t border-zinc-100 dark:border-zinc-800/60 pt-4 md:col-span-2">
                    <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/50 flex items-start gap-3">
                      <svg className="h-5 w-5 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">Payment Methods & Surcharges</p>
                        <p className="text-xs text-violet-700 dark:text-violet-400 mt-0.5">
                          Checkout payment options (Cash on Delivery, Stripe, PayPal, etc.), customer instructions, and fees are managed under the{" "}
                          <a href="/dashboard/payment-methods" className="font-bold underline hover:text-violet-900 dark:hover:text-violet-100">
                            Payment Methods Module
                          </a>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SEO & SOCIALS */}
          {activeTab === "seo" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Social Media Integrations
                </h3>
                <p className="text-xs text-zinc-550 dark:text-zinc-400 font-semibold">
                  Storefront link configuration for icon routing in footer.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Instagram URL
                  </label>
                  <input
                    type="text"
                    disabled={!permissions.update}
                    {...register("social_links.instagram")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none text-sm"
                    placeholder="https://instagram.com/handle"
                  />
                  {errors.social_links?.instagram && (
                    <p className="mt-1 text-xs text-red-500 font-medium">
                      {errors.social_links.instagram.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Twitter / X URL
                  </label>
                  <input
                    type="text"
                    disabled={!permissions.update}
                    {...register("social_links.twitter")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none text-sm"
                    placeholder="https://twitter.com/handle"
                  />
                  {errors.social_links?.twitter && (
                    <p className="mt-1 text-xs text-red-500 font-medium">
                      {errors.social_links.twitter.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Facebook URL
                  </label>
                  <input
                    type="text"
                    disabled={!permissions.update}
                    {...register("social_links.facebook")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none text-sm"
                    placeholder="https://facebook.com/handle"
                  />
                  {errors.social_links?.facebook && (
                    <p className="mt-1 text-xs text-red-500 font-medium">
                      {errors.social_links.facebook.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    TikTok URL
                  </label>
                  <input
                    type="text"
                    disabled={!permissions.update}
                    {...register("social_links.tiktok")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none text-sm"
                    placeholder="https://tiktok.com/@handle"
                  />
                  {errors.social_links?.tiktok && (
                    <p className="mt-1 text-xs text-red-500 font-medium">
                      {errors.social_links.tiktok.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    YouTube URL
                  </label>
                  <input
                    type="text"
                    disabled={!permissions.update}
                    {...register("social_links.youtube")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none text-sm"
                    placeholder="https://youtube.com/channel"
                  />
                  {errors.social_links?.youtube && (
                    <p className="mt-1 text-xs text-red-500 font-medium">
                      {errors.social_links.youtube.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Global SEO Metadata
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Configure storefront metadata for bots and shared links.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      Meta Title
                    </label>
                    <input
                      type="text"
                      disabled={!permissions.update}
                      {...register("meta_info.title")}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none text-sm"
                      placeholder="My Premium Online E-Commerce"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      Meta Description
                    </label>
                    <textarea
                      disabled={!permissions.update}
                      rows={3}
                      {...register("meta_info.description")}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none text-sm"
                      placeholder="Describe what your online shop does for web spiders..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      Meta Keywords
                    </label>
                    <input
                      type="text"
                      disabled={!permissions.update}
                      {...register("meta_info.keywords")}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none text-sm"
                      placeholder="ecommerce, store, fashion, clothing"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Sitemap & Saved Static Rendering */}
              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>Dynamic Sitemap & Rapid Pre-rendering</span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Quick Fetch Active
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Generate and save a pre-rendered <code className="text-indigo-600 dark:text-indigo-400 font-mono">sitemap.xml</code> file directly to public storage for instant response when web crawlers visit your shop.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Status:{" "}
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {sitemapStats.lastGenerated
                          ? `Saved on Disk (${sitemapStats.urlCount ?? "—"} URLs indexed)`
                          : "Dynamic Fallback Active (Not manually saved to public disk)"}
                      </span>
                    </p>
                    {sitemapStats.lastGenerated && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Last rebuilt: {new Date(sitemapStats.lastGenerated).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <a
                      href="/sitemap.xml"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      View sitemap.xml ↗
                    </a>
                    <button
                      type="button"
                      disabled={!permissions.update || isGeneratingSitemap || isPending}
                      onClick={handleGenerateSitemap}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      {isGeneratingSitemap ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </>
                      ) : (
                        "⚡ Generate / Rebuild Sitemap"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
    </form>
  );
}
