"use client";

import { useId, useState, ChangeEvent } from "react";
import Image from "next/image";
import { useImageGroupContext } from "./image-input-group";

export interface ImageInputProps {
  /** Optional header label for the field (string or ReactNode) */
  label?: string | React.ReactNode;
  /** Optional right-aligned header elements (e.g. badges, remove button) */
  headerRight?: React.ReactNode;
  /** Current image URL or relative path */
  value: string;
  /** Callback triggered when URL/path changes */
  onChange: (url: string) => void;
  /** Image alt text (for SEO accessibility) */
  altValue?: string;
  /** Callback triggered when alt text changes */
  onAltChange?: (alt: string) => void;
  /** Whether to show the Image Alt Text input underneath (default: true) */
  showAltField?: boolean;
  /** Callback when user selects a file for upload */
  onFileSelect?: (file: File | null) => void;
  /** Currently staged file */
  file?: File | null;
  /** Legacy alias for staged file */
  pendingFile?: File | null;
  /** Callback when image size is fetched */
  onSizeFetch?: (size: number) => void;
  /** Callback when preview URL is confirmed via Fetch Image */
  onPreviewFetch?: (url: string) => void;
  /** Validation error message for image URL */
  error?: string;
  /** Validation error message for alt text */
  altError?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Required field indicator */
  required?: boolean;
  /** Upload folder subpath hint (e.g. "categories", "branding", default: "uploads") */
  uploadFolder?: string;
  /** Additional container styling */
  className?: string;
}

export function ImageInput({
  label,
  headerRight,
  value,
  onChange,
  altValue = "",
  onAltChange,
  showAltField = true,
  file,
  pendingFile,
  onFileSelect,
  onSizeFetch,
  onPreviewFetch,
  error,
  altError,
  disabled = false,
  required = false,
  uploadFolder = "uploads",
  className = "",
}: ImageInputProps) {
  const fileInputId = useId();
  const urlInputId = useId();
  const altInputId = useId();

  const { formatBytes, deriveFormat, fetchImageSpecs, createObjectUrl } =
    useImageGroupContext();

  const activeFile = file ?? pendingFile ?? null;
  const [fetchedSize, setFetchedSize] = useState<number | null>(null);
  const [fetchedFormat, setFetchedFormat] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const previewUrl = activeFile ? createObjectUrl(activeFile) : value;

  const fileFormat = activeFile
    ? deriveFormat(activeFile)
    : fetchedFormat || deriveFormat(null, value);

  const fileSize = activeFile
    ? formatBytes(activeFile.size)
    : fetchedSize !== null
      ? formatBytes(fetchedSize)
      : value
        ? "Click Fetch"
        : "0 Bytes";

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit");
      return;
    }

    setFetchError(null);
    setFetchedSize(selectedFile.size);
    setFetchedFormat(deriveFormat(selectedFile));
    onFileSelect?.(selectedFile);
  };

  const handleFetchClick = async () => {
    if (!value || activeFile || isFetching) return;
    setIsFetching(true);
    setFetchError(null);

    onPreviewFetch?.(value);
    const res = await fetchImageSpecs(value);
    setIsFetching(false);
    if (res.error) {
      setFetchError(res.error);
      setFetchedSize(null);
    } else {
      if (res.size !== null) {
        setFetchedSize(res.size);
        onSizeFetch?.(res.size);
      }
      if (res.format) setFetchedFormat(res.format);
    }
  };

  return (
    <div
      className={`space-y-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 ${className}`}
    >
      {(label || headerRight) && (
        <div className="flex items-center justify-between pb-1">
          {typeof label === "string" ? (
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
          ) : (
            label
          )}
          {headerRight}
        </div>
      )}

      {/* Top Row: Image File Picker + Display Specs (Format & Size ONLY) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
        {/* Left Side: Upload Button & Preview Thumbnail */}
        <div className="relative border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-2.5 bg-zinc-50/50 dark:bg-zinc-800/30 hover:border-emerald-500 transition-colors flex items-center gap-2.5">
          <input
            id={fileInputId}
            type="file"
            accept="image/*"
            disabled={disabled}
            onChange={handleFileChange}
            className="hidden"
          />

          {previewUrl ? (
            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0 bg-zinc-900/10 dark:bg-zinc-900/40">
              <Image
                src={previewUrl}
                alt={typeof label === "string" ? label : "Preview"}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-zinc-200/70 dark:bg-zinc-700/60 flex items-center justify-center shrink-0 text-zinc-500 dark:text-zinc-400">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <label
              htmlFor={disabled ? undefined : fileInputId}
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                disabled
                  ? "opacity-50 cursor-not-allowed border-zinc-200 text-zinc-400"
                  : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              }`}
            >
              <span>{previewUrl ? "Change" : "Choose"}</span>
            </label>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              JPG, PNG, WebP (10MB)
            </p>
          </div>
        </div>

        {/* Right Side: Specifications (Format & Size ONLY) */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 bg-zinc-50/80 dark:bg-zinc-800/50 flex flex-col justify-between text-xs space-y-1">
          <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
            SPECIFICATIONS
          </span>
          <div className="grid grid-cols-2 gap-2 text-zinc-700 dark:text-zinc-300 font-medium text-[11px]">
            <div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block">Format</span>
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                {fileFormat}
              </span>
            </div>
            <div className="truncate">
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block">Size</span>
              <span
                className="truncate block font-semibold text-[10px] font-mono"
                title={fileSize}
              >
                {fileSize}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Image Path & Alt Text */}
      <div className="space-y-3 pt-1">
        <div>
          <label
            htmlFor={urlInputId}
            className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Image Path / URL
          </label>
          <div className="flex items-center gap-2">
            <input
              id={urlInputId}
              type="text"
              disabled={disabled || Boolean(activeFile)}
              readOnly={Boolean(activeFile)}
              value={value}
              onChange={(e) => {
                setFetchError(null);
                onChange(e.target.value);
              }}
              placeholder={`/uploads/${uploadFolder}/example.webp`}
              className={`flex-1 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono ${
                activeFile
                  ? "opacity-60 bg-zinc-100 dark:bg-zinc-900 cursor-not-allowed"
                  : ""
              }`}
            />
            <button
              type="button"
              disabled={!value || disabled || Boolean(activeFile) || isFetching}
              onClick={handleFetchClick}
              className="px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
            >
              {isFetching ? "Fetching..." : "Fetch Image"}
            </button>
          </div>
          {fetchError ? (
            <p className="mt-1 text-xs text-red-500 font-medium">{fetchError}</p>
          ) : error ? (
            <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>
          ) : null}
        </div>

        {showAltField && onAltChange && (
          <div>
            <label
              htmlFor={altInputId}
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Image Alt Text (SEO Accessibility)
            </label>
            <input
              id={altInputId}
              type="text"
              disabled={disabled}
              value={altValue}
              onChange={(e) => onAltChange(e.target.value)}
              placeholder="Descriptive alt text for search engines and screen readers"
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs disabled:opacity-50"
            />
            {altError && (
              <p className="mt-1 text-xs text-red-500 font-medium">{altError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageInput;
