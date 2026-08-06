"use client";

import { useId, useState, ChangeEvent, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useImageGroupContext, fetchImageSpecs } from "./image-input-group";
import { ImageOptimizeModal, OptimizationItem } from "./image-optimize-modal";
import { urlToFile, getImageDimensions } from "@/lib/image-optimizer";

export interface ImageInputProps {
  /** Optional header label for the field (string or ReactNode) */
  label?: string | React.ReactNode;
  /** Optional right-aligned header elements (e.g. badges, remove button) */
  headerRight?: React.ReactNode;
  /**
   * Current image URL / relative path (read-only — display only).
   * Used to show the existing saved thumbnail. Never editable by the user.
   */
  value?: string;
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
  /** Validation error message */
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
  value = "",
  altValue = "",
  onAltChange,
  showAltField = true,
  file,
  pendingFile,
  onFileSelect,
  error,
  altError,
  disabled = false,
  required = false,
  uploadFolder = "uploads",
  className = "",
}: ImageInputProps) {
  const fileInputId = useId();
  const altInputId = useId();
  // Stable unique ID for registration with group context
  const instanceId = useId();

  const { formatBytes, deriveFormat, createObjectUrl, registerImage, unregisterImage } =
    useImageGroupContext();

  const activeFile = file ?? pendingFile ?? null;
  const [fileDimensions, setFileDimensions] = useState<{ width: number; height: number } | null>(null);
  const [fetchedSize, setFetchedSize] = useState<number | null>(null);

  // Single-image optimization modal state
  const [isOptimizeModalOpen, setIsOptimizeModalOpen] = useState(false);
  const [optimizeItems, setOptimizeItems] = useState<OptimizationItem[]>([]);
  const [isBuildingOptimize, setIsBuildingOptimize] = useState(false);

  const previewUrl = activeFile ? createObjectUrl(activeFile) : value;

  // Auto-calculate size & dimensions whenever the staged file or value URL changes
  useEffect(() => {
    let cancelled = false;

    if (activeFile) {
      setFetchedSize(null);
      getImageDimensions(activeFile)
        .then((dims) => {
          if (!cancelled) setFileDimensions(dims);
        })
        .catch(() => {
          if (!cancelled) setFileDimensions(null);
        });
      return () => {
        cancelled = true;
      };
    }

    if (value && !value.startsWith("blob:")) {
      setFileDimensions(null);
      setFetchedSize(null);

      // 1) Auto-calculate dimensions for loaded image URL
      const img = new window.Image();
      img.onload = () => {
        if (!cancelled && img.naturalWidth && img.naturalHeight) {
          setFileDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        }
      };
      img.src = value;

      // 2) Auto-calculate file size from source URL
      fetchImageSpecs(value).then((specs) => {
        if (!cancelled && specs.size !== null) {
          setFetchedSize(specs.size);
        }
      });

      return () => {
        cancelled = true;
      };
    }

    setFileDimensions(null);
    setFetchedSize(null);
  }, [activeFile, value]);

  const fileFormat = activeFile
    ? deriveFormat(activeFile)
    : deriveFormat(null, value);

  const fileSize = activeFile
    ? formatBytes(activeFile.size)
    : fetchedSize !== null
      ? formatBytes(fetchedSize)
      : value
        ? "Calculating..."
        : "—";

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit");
      return;
    }

    onFileSelect?.(selectedFile);
  };

  // ─── Optimization ───────────────────────────────────────────────────────────

  const handleOptimizeClick = async () => {
    if (!activeFile && !value) return;
    setIsBuildingOptimize(true);

    let originalFile: File | null = null;

    if (activeFile) {
      originalFile = activeFile;
    } else if (value && !value.startsWith("blob:")) {
      originalFile = await urlToFile(value, value.split("/").pop() || "image");
    }

    setIsBuildingOptimize(false);

    if (!originalFile) return;

    const labelStr =
      typeof label === "string"
        ? label
        : originalFile.name || "Image";

    setOptimizeItems([{ id: instanceId, label: labelStr, originalFile }]);
    setIsOptimizeModalOpen(true);
  };

  const handleOptimizeSave = useCallback(
    (optimizedFilesMap: Record<string, File>) => {
      const optimizedFile = optimizedFilesMap[instanceId];
      if (optimizedFile && onFileSelect) {
        onFileSelect(optimizedFile);
      }
    },
    [instanceId, onFileSelect],
  );

  // ─── Group Registration ─────────────────────────────────────────────────────

  // Keep stable refs to current file/url so the getters are always fresh
  const activeFileRef = useRef<File | null>(null);
  const valueRef = useRef<string>("");
  activeFileRef.current = activeFile;
  valueRef.current = value;

  useEffect(() => {
    registerImage(
      instanceId,
      () => activeFileRef.current,
      () => valueRef.current,
      (optimizedFile: File) => {
        if (onFileSelect) {
          onFileSelect(optimizedFile);
        }
      },
    );

    return () => {
      unregisterImage(instanceId);
    };
  }, [instanceId, registerImage, unregisterImage]); // intentionally exclude onFileSelect

  // Whether there is an image source to optimize
  const canOptimize = Boolean(activeFile || value);

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

      {/* Top Row: Image File Picker (1 part) + Display Specs (2 parts) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
        {/* Left Side: Full-Size Image Preview with Hover Overlay (Ratio 1) */}
        <div className="sm:col-span-1 relative flex flex-col justify-stretch">
          <input
            id={fileInputId}
            type="file"
            accept="image/*"
            disabled={disabled}
            onChange={handleFileChange}
            className="hidden"
          />

          {previewUrl ? (
            <div className="group relative w-full aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-1">
              <Image
                src={previewUrl}
                alt={typeof label === "string" ? label : "Preview"}
                fill
                className="object-contain p-1 transition-transform duration-300 group-hover:scale-105"
              />

              {/* Hover Overlay */}
              <label
                htmlFor={disabled ? undefined : fileInputId}
                className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer p-2 text-center text-white select-none"
              >
                <span className="px-3 py-1.5 rounded-lg bg-white text-zinc-900 font-bold text-xs shadow-md hover:bg-zinc-100 transition-colors flex items-center gap-1.5">
                  <svg
                    className="w-3.5 h-3.5 text-zinc-800"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
                    />
                  </svg>
                  <span>Change Image</span>
                </span>
                <span className="text-[10px] font-medium text-zinc-200">
                  Click to select new photo
                </span>
              </label>
            </div>
          ) : (
            <label
              htmlFor={disabled ? undefined : fileInputId}
              className="relative w-full aspect-square border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-800/30 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group"
            >
              <div className="w-9 h-9 rounded-full bg-zinc-200/70 dark:bg-zinc-700/60 flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 dark:group-hover:bg-emerald-900/50 dark:group-hover:text-emerald-400 transition-colors">
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
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Choose Image
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                JPG, PNG, WebP, AVIF (10MB)
              </span>
            </label>
          )}
        </div>

        {/* Right Side: Specifications + Optimize Button (Ratio 2) */}
        <div className="sm:col-span-2 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 bg-zinc-50/80 dark:bg-zinc-800/50 flex flex-col justify-between space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-wider text-zinc-500 dark:text-zinc-400">
            SPECIFICATIONS
          </span>
          <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-zinc-700 dark:text-zinc-300">
            <div>
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">Format</span>
              <span className="inline-block px-2.5 py-0.5 rounded-md text-sm font-mono font-extrabold bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100">
                {fileFormat}
              </span>
            </div>
            <div className="truncate">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">Size</span>
              <span
                className="truncate block font-extrabold text-sm font-mono text-zinc-900 dark:text-zinc-100"
                title={fileSize}
              >
                {fileSize}
              </span>
            </div>
            <div>
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">Dimensions</span>
              <span className="font-mono text-sm font-extrabold text-zinc-900 dark:text-zinc-100 block truncate">
                {fileDimensions ? `${fileDimensions.width} × ${fileDimensions.height} px` : "—"}
              </span>
            </div>
          </div>

          {/* Optimize Button */}
          {canOptimize && !disabled && (
            <button
              type="button"
              disabled={isBuildingOptimize}
              onClick={handleOptimizeClick}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-400/50 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all cursor-pointer disabled:opacity-50 w-full justify-center"
            >
              {isBuildingOptimize ? (
                <>
                  <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  <span>Optimize Image</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      )}

      {/* Alt Text field */}
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

      {/* Single-image Optimization Modal */}
      <ImageOptimizeModal
        isOpen={isOptimizeModalOpen}
        onClose={() => setIsOptimizeModalOpen(false)}
        items={optimizeItems}
        onSave={handleOptimizeSave}
      />
    </div>
  );
}

export default ImageInput;
