"use client";

import { useId, useState, ChangeEvent, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useImageGroupContext, fetchImageSpecs } from "./image-input-group";
import { ImageOptimizeModal, OptimizationItem } from "./image-optimize-modal";
import { urlToFile, getImageDimensions } from "@/lib/image-optimizer";

export interface ImageInputProps {
  /** Unique identifier for the input */
  id?: string;
  /** Optional header label for the field (string or ReactNode) */
  label?: string | React.ReactNode;
  /** Optional right-aligned header elements (e.g. custom badges) */
  headerRight?: React.ReactNode;
  /**
   * Current image URL / relative path (read-only — display only).
   * Used to show the existing saved thumbnail.
   */
  value?: string;
  /** Image alt text (for SEO accessibility) */
  altValue?: string;
  /** Callback triggered when alt text changes */
  onAltChange?: (alt: string) => void;
  /** Whether to show the Image Alt Text input underneath (default: true) */
  showAltField?: boolean;
  /** Callback when user selects a file for upload, or clears it (null) */
  onFileSelect?: (file: File | null) => void;
  /** Currently staged file */
  file?: File | null;
  /** Legacy alias for staged file */
  pendingFile?: File | null;
  /** Callback when user clicks the remove image button */
  onRemove?: () => void;
  /** Validation error message for image */
  error?: string;
  /** Validation error message for alt text */
  altError?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Required field indicator */
  required?: boolean;
  /** Upload folder subpath hint */
  uploadFolder?: string;
  /** Additional container styling */
  className?: string;
}

export function ImageInput({
  id: customId,
  label,
  headerRight,
  value = "",
  altValue = "",
  onAltChange,
  showAltField = true,
  file,
  pendingFile,
  onFileSelect,
  onRemove,
  error,
  altError,
  disabled = false,
  required = false,
  uploadFolder = "uploads",
  className = "",
}: ImageInputProps) {
  const generatedId = useId();
  const instanceId = customId || generatedId;
  const fileInputId = `${instanceId}-file`;
  const altInputId = `${instanceId}-alt`;
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      // Auto-calculate dimensions for loaded image URL
      const img = new window.Image();
      img.onload = () => {
        if (!cancelled && img.naturalWidth && img.naturalHeight) {
          setFileDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        }
      };
      img.src = value;

      // Auto-calculate file size from source URL
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

  const handleRemoveImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (onRemove) {
      onRemove();
    }
    if (onFileSelect) {
      onFileSelect(null);
    }
  };

  // Optimization
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

  // Group Registration
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
      handleRemoveImage,
    );

    return () => {
      unregisterImage(instanceId);
    };
  }, [instanceId, registerImage, unregisterImage]);

  const hasImage = Boolean(activeFile || value);

  return (
    <div
      className={`space-y-3 p-4 rounded-xl border border-dashboard-border bg-dashboard-card shadow-2xs ${className}`}
    >
      {/* Header with Label and Optional Right Controls */}
      {(label || headerRight) && (
        <div className="flex items-center justify-between pb-1 border-b border-dashboard-border-subtle">
          {typeof label === "string" ? (
            <label className="block text-xs font-bold text-dashboard-fg">
              {label} {required && <span className="text-dashboard-danger">*</span>}
            </label>
          ) : (
            label
          )}
          {headerRight}
        </div>
      )}

      {/* Main Content: Preview / Upload Area + Specifications & Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
        {/* Left Column: Image Preview or Upload Dropzone */}
        <div className="sm:col-span-1 relative flex flex-col justify-stretch">
          <input
            id={fileInputId}
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={disabled}
            onChange={handleFileChange}
            className="hidden"
          />

          {previewUrl ? (
            <div className="group relative w-full aspect-square rounded-xl overflow-hidden border border-dashboard-border bg-dashboard-muted-bg flex items-center justify-center p-1">
              <Image
                src={previewUrl}
                alt={typeof label === "string" ? label : "Preview"}
                fill
                className="object-contain p-1 transition-transform duration-300 group-hover:scale-105"
              />

              {/* Hover Actions Overlay */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-2 p-2 text-center text-white select-none">
                <label
                  htmlFor={disabled ? undefined : fileInputId}
                  className="px-3 py-1.5 rounded-lg bg-dashboard-card text-dashboard-fg font-bold text-xs shadow-md hover:bg-dashboard-card-hover transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <svg
                    className="w-3.5 h-3.5"
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
                  <span>Change</span>
                </label>

                {!disabled && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-2.5 py-1 rounded-lg bg-dashboard-danger text-dashboard-danger-fg font-semibold text-[11px] hover:bg-dashboard-danger-hover transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <label
              htmlFor={disabled ? undefined : fileInputId}
              className="relative w-full aspect-square border-2 border-dashed border-dashboard-border rounded-xl p-3 bg-dashboard-muted-bg/50 hover:border-dashboard-primary hover:bg-dashboard-card-hover transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group"
            >
              <div className="w-9 h-9 rounded-full bg-dashboard-border flex items-center justify-center text-dashboard-muted group-hover:bg-dashboard-primary group-hover:text-dashboard-primary-fg transition-colors">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                  />
                </svg>
              </div>
              <span className="text-xs font-semibold text-dashboard-fg group-hover:text-dashboard-primary transition-colors">
                Upload Image
              </span>
              <span className="text-[10px] text-dashboard-muted">
                JPG, PNG, WebP, AVIF (Max 10MB)
              </span>
            </label>
          )}
        </div>

        {/* Right Column: Specifications & Actions */}
        <div className="sm:col-span-2 border border-dashboard-border rounded-xl p-3.5 bg-dashboard-muted-bg/30 flex flex-col justify-between space-y-3">
          <div>
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-dashboard-muted block mb-2">
              Specifications
            </span>
            <div className="grid grid-cols-3 gap-2 text-dashboard-fg">
              <div>
                <span className="text-[10px] font-medium text-dashboard-muted block mb-0.5">Format</span>
                <span className="inline-block px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-dashboard-muted-bg text-dashboard-fg border border-dashboard-border">
                  {fileFormat}
                </span>
              </div>
              <div className="truncate">
                <span className="text-[10px] font-medium text-dashboard-muted block mb-0.5">Size</span>
                <span
                  className="truncate block font-bold text-xs font-mono text-dashboard-fg"
                  title={fileSize}
                >
                  {fileSize}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-medium text-dashboard-muted block mb-0.5">Dimensions</span>
                <span className="font-mono text-xs font-bold text-dashboard-fg block truncate">
                  {fileDimensions ? `${fileDimensions.width} × ${fileDimensions.height} px` : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Row: Change Button, Remove Button, Optimize Button */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dashboard-border-subtle">
            {hasImage && !disabled && (
              <>
                <label
                  htmlFor={fileInputId}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashboard-border bg-dashboard-card text-dashboard-fg text-xs font-medium hover:bg-dashboard-card-hover transition-colors cursor-pointer"
                >
                  <svg
                    className="w-3.5 h-3.5 text-dashboard-muted"
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
                  <span>Change</span>
                </label>

                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashboard-border bg-dashboard-danger-subtle text-dashboard-danger text-xs font-medium hover:bg-dashboard-danger hover:text-dashboard-danger-fg transition-colors cursor-pointer"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                  <span>Remove</span>
                </button>
              </>
            )}

            {hasImage && !disabled && (
              <button
                type="button"
                disabled={isBuildingOptimize}
                onClick={handleOptimizeClick}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashboard-border bg-dashboard-accent-subtle text-dashboard-accent-fg text-xs font-bold hover:bg-dashboard-accent/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isBuildingOptimize ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    <span>Optimize</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-dashboard-danger font-medium">{error}</p>
      )}

      {/* Alt Text field */}
      {showAltField && onAltChange && (
        <div>
          <label
            htmlFor={altInputId}
            className="block text-xs font-semibold text-dashboard-fg mb-1"
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
            className="w-full px-3 py-2 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted text-xs focus:outline-none focus:ring-1 focus:ring-dashboard-primary disabled:opacity-50"
          />
          {altError && (
            <p className="mt-1 text-xs text-dashboard-danger font-medium">{altError}</p>
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
