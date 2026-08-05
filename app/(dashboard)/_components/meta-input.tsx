"use client";

import { useState } from "react";
import {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import ImageInput from "./image-input";
import ImageInputGroup from "./image-input-group";

export interface MetaInputProps {
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  errors?: FieldErrors<any>;
  disabled?: boolean;
  /** Field path prefix for nested form state (default: "meta_info") */
  prefix?: string;
  /** Custom folder name for uploading OG images (default: "seo") */
  uploadFolder?: string;
  /** Default title to show in live preview if field is empty */
  defaultTitle?: string | null;
  /** Default description to show in live preview if field is empty */
  defaultDescription?: string | null;
  /** Callback when user selects an OG image file for upload */
  onOgImageFileSelect?: (file: File | null) => void;
  /** Currently staged OG image file */
  pendingOgImageFile?: File | null;
}

export default function MetaInput({
  register,
  watch,
  setValue,
  errors,
  disabled = false,
  prefix = "meta_info",
  uploadFolder = "seo",
  defaultTitle = "Page Title | Store Name",
  defaultDescription = "Add a meta description to optimize your storefront search engine rankings and social media share previews.",
  onOgImageFileSelect,
  pendingOgImageFile,
}: MetaInputProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    "meta" | "og" | "preview"
  >("meta");

  // Watch field values for character counts & live previews
  const metaTitle = watch(`${prefix}.title`) || "";
  const metaDescription = watch(`${prefix}.description`) || "";
  const metaKeywords = watch(`${prefix}.keywords`) || "";
  const ogTitle = watch(`${prefix}.og_title`) || "";
  const ogDescription = watch(`${prefix}.og_description`) || "";
  const ogImage = watch(`${prefix}.og_image`) || "";

  // Helper functions to copy meta info to OG fields
  const handleCopyTitleToOg = () => {
    if (disabled) return;
    setValue(`${prefix}.og_title`, metaTitle, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleCopyDescriptionToOg = () => {
    if (disabled) return;
    setValue(`${prefix}.og_description`, metaDescription, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  // Extract nested error objects safely
  const getNestedError = (fieldName: string) => {
    if (!errors) return undefined;
    const parts = fieldName.split(".");
    let current: any = errors;
    for (const part of parts) {
      if (!current || typeof current !== "object") return undefined;
      current = current[part];
    }
    return current?.message ? String(current.message) : undefined;
  };

  // Preview computations
  const previewTitle = metaTitle || defaultTitle;
  const previewDescription = metaDescription || defaultDescription;
  const previewOgTitle = ogTitle || metaTitle || defaultTitle;
  const previewOgDescription =
    ogDescription || metaDescription || defaultDescription;

  return (
    <div className="space-y-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
      {/* Header & Sub-navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-indigo-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span>Search & OpenGraph Metadata</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Optimize search engine visibility and social media share previews for this content.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab("meta")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSubTab === "meta"
                ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            Search Meta
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("og")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSubTab === "og"
                ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            OpenGraph Tags
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("preview")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSubTab === "preview"
                ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            Live Previews
          </button>
        </div>
      </div>

      {/* TAB 1: META SEARCH ENGINE */}
      {activeSubTab === "meta" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Meta Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={`${prefix}_title`}
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
              >
                Meta Title
              </label>
              <span
                className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-md ${
                  metaTitle.length >= 50 && metaTitle.length <= 60
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : metaTitle.length > 60
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {metaTitle.length} / 60 chars (Recommended: 50-60)
              </span>
            </div>
            <input
              id={`${prefix}_title`}
              type="text"
              disabled={disabled}
              {...register(`${prefix}.title`)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm"
              placeholder="e.g., Premium Wireless Headphones | Audio Store"
            />
            {getNestedError(`${prefix}.title`) && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                {getNestedError(`${prefix}.title`)}
              </p>
            )}
          </div>

          {/* Meta Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={`${prefix}_description`}
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
              >
                Meta Description
              </label>
              <span
                className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-md ${
                  metaDescription.length >= 120 && metaDescription.length <= 160
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : metaDescription.length > 160
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {metaDescription.length} / 160 chars (Recommended: 120-160)
              </span>
            </div>
            <textarea
              id={`${prefix}_description`}
              rows={3}
              disabled={disabled}
              {...register(`${prefix}.description`)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm"
              placeholder="Brief summary snippet shown in search engine query results..."
            />
            {getNestedError(`${prefix}.description`) && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                {getNestedError(`${prefix}.description`)}
              </p>
            )}
          </div>

          {/* Keywords */}
          <div>
            <label
              htmlFor={`${prefix}_keywords`}
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5"
            >
              Focus Keywords
            </label>
            <input
              id={`${prefix}_keywords`}
              type="text"
              disabled={disabled}
              {...register(`${prefix}.keywords`)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm"
              placeholder="Comma separated: audio, noise cancelling, bluetooth"
            />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              Separate focus tags or search terms with commas.
            </p>
            {getNestedError(`${prefix}.keywords`) && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                {getNestedError(`${prefix}.keywords`)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: OPENGRAPH TAGS */}
      {activeSubTab === "og" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* OG Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={`${prefix}_og_title`}
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
              >
                OpenGraph Title (og:title)
              </label>
              {metaTitle && (
                <button
                  type="button"
                  onClick={handleCopyTitleToOg}
                  disabled={disabled}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                >
                  Copy from Meta Title
                </button>
              )}
            </div>
            <input
              id={`${prefix}_og_title`}
              type="text"
              disabled={disabled}
              {...register(`${prefix}.og_title`)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm"
              placeholder="Leave empty to fallback to Meta Title"
            />
          </div>

          {/* OG Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={`${prefix}_og_description`}
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
              >
                OpenGraph Description (og:description)
              </label>
              {metaDescription && (
                <button
                  type="button"
                  onClick={handleCopyDescriptionToOg}
                  disabled={disabled}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                >
                  Copy from Meta Description
                </button>
              )}
            </div>
            <textarea
              id={`${prefix}_og_description`}
              rows={3}
              disabled={disabled}
              {...register(`${prefix}.og_description`)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm"
              placeholder="Leave empty to fallback to Meta Description"
            />
          </div>

          {/* OG Image Picker */}
          <ImageInputGroup>
            <ImageInput
              label="OpenGraph Social Image (og:image)"
              value={ogImage}
              onChange={(url) =>
                setValue(`${prefix}.og_image`, url, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              onFileSelect={onOgImageFileSelect}
              file={pendingOgImageFile}
              showAltField={false}
              disabled={disabled}
              uploadFolder={uploadFolder}
            />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              Recommended dimensions: 1200 x 630 pixels. Used for Facebook, LinkedIn, Discord, and messaging app share previews.
            </p>
          </ImageInputGroup>
        </div>
      )}

      {/* TAB 3: LIVE PREVIEWS */}
      {activeSubTab === "preview" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Google Search Result Preview */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-800/30">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2A10 10 0 1022 12 10.011 10.011 0 0012 2zm0 18a8 8 0 118-8 8.009 8.009 0 01-8 8z"/>
              </svg>
              Google Search Result Snippet
            </h4>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 shadow-2xs font-sans max-w-xl">
              <div className="text-[12px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 truncate">
                <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-[9px] text-indigo-600 font-bold">
                  S
                </span>
                <span>https://yourstore.com</span>
                <span className="text-zinc-400">› page</span>
              </div>
              <h5 className="text-indigo-700 dark:text-indigo-400 hover:underline text-base font-medium truncate mt-0.5 cursor-pointer">
                {previewTitle}
              </h5>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                {previewDescription}
              </p>
            </div>
          </div>

          {/* Social OpenGraph Share Card Preview */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-800/30">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Social Share OpenGraph Card (Facebook, LinkedIn, Discord, WhatsApp)
            </h4>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs max-w-md">
              {ogImage ? (
                <div className="relative w-full h-44 bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <img
                    src={ogImage}
                    alt={previewOgTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-36 bg-zinc-100 dark:bg-zinc-800/80 flex flex-col items-center justify-center text-zinc-400 gap-1.5">
                  <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs">No OG Image Specified</span>
                </div>
              )}
              <div className="p-3.5 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  yourstore.com
                </span>
                <h5 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                  {previewOgTitle}
                </h5>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                  {previewOgDescription}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
