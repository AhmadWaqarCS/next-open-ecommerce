"use client";

import React, { createContext, useContext, useCallback, useRef, useState } from "react";
import { ImageOptimizeModal, OptimizationItem } from "./image-optimize-modal";
import { urlToFile } from "@/lib/image-optimizer";

// ─── Context Types ─────────────────────────────────────────────────────────────

export interface ImageGroupContextType {
  formatBytes: (bytes: number, decimals?: number) => string;
  deriveFormat: (
    file?: File | null,
    url?: string,
    contentType?: string | null,
  ) => string;
  createObjectUrl: (file: File) => string;
  /** Register a child image input so the group can batch-optimize or clear it */
  registerImage: (
    id: string,
    getFile: () => File | null,
    getUrl: () => string,
    onOptimized: (file: File) => void,
    onClear?: () => void,
  ) => void;
  /** Unregister on unmount */
  unregisterImage: (id: string) => void;
}

// ─── Standalone Utilities (exported for use in image-input.tsx) ───────────────

export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function deriveFormat(
  file?: File | null,
  url?: string,
  contentType?: string | null,
): string {
  if (file) {
    if (file.type && file.type.includes("/")) {
      return file.type.split("/")[1].toUpperCase();
    }
    const ext = file.name.split(".").pop()?.toUpperCase();
    return ext || "IMG";
  }
  if (contentType && contentType.includes("/")) {
    return contentType.split("/")[1].toUpperCase();
  }
  if (url) {
    const ext = url.split(".").pop()?.toUpperCase() || "URL";
    return ext.length <= 5 ? ext : "URL";
  }
  return "N/A";
}

export async function fetchImageSpecs(url: string): Promise<{
  size: number | null;
  format: string | null;
  error: string | null;
}> {
  if (!url || url.startsWith("blob:")) {
    return { size: null, format: null, error: null };
  }
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (res.ok) {
      const contentType = res.headers.get("content-type");
      const cl = res.headers.get("content-length");
      const format = deriveFormat(null, url, contentType);
      const size = cl ? parseInt(cl, 10) : null;
      if (size !== null) {
        return { size, format, error: null };
      }
    }
    const getRes = await fetch(url);
    if (getRes.ok) {
      const blob = await getRes.blob();
      const format = deriveFormat(null, url, blob.type);
      return { size: blob.size, format, error: null };
    }
    return { size: null, format: null, error: "Image not found" };
  } catch {
    return { size: null, format: null, error: "Failed to fetch" };
  }
}

export function createObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface RegisteredImageEntry {
  getFile: () => File | null;
  getUrl: () => string;
  onOptimized: (file: File) => void;
  onClear?: () => void;
}

const defaultContext: ImageGroupContextType = {
  formatBytes,
  deriveFormat,
  createObjectUrl,
  registerImage: () => {},
  unregisterImage: () => {},
};

const ImageGroupContext = createContext<ImageGroupContextType>(defaultContext);

export function useImageGroupContext(): ImageGroupContextType {
  return useContext(ImageGroupContext);
}

// ─── ImageInputGroup Props ────────────────────────────────────────────────────

export interface ImageInputGroupProps {
  /** Optional section title/header */
  title?: string | React.ReactNode;
  /** Optional subtitle or descriptive help text */
  description?: string;
  /** Custom outer container class name */
  className?: string;
  /** Child layout style: 'stack' | 'wrap' | 'grid' */
  layout?: "stack" | "wrap" | "grid";
  /** If true, group is fixed and does not render add images button */
  fixed?: boolean;
  /** Callback to add another image component (enables dynamic mode) */
  onAdd?: () => void;
  /** Custom label for the add button (default: "Add Image") */
  addLabel?: string;
  /** Callback to remove all image components (dynamic mode) */
  onRemoveAll?: () => void;
  /** Callback to clear out all image input components (fixed mode) */
  onClearAll?: () => void;
  /** Inner ImageInput component(s) */
  children?: React.ReactNode;
}

// ─── ImageInputGroup Component ────────────────────────────────────────────────

export function ImageInputGroup({
  title,
  description,
  className = "",
  layout = "stack",
  fixed,
  onAdd,
  addLabel = "Add Image",
  onRemoveAll,
  onClearAll,
  children,
}: ImageInputGroupProps) {
  const registryRef = useRef<Map<string, RegisteredImageEntry>>(new Map());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalItems, setModalItems] = useState<OptimizationItem[]>([]);
  const [isBuildingItems, setIsBuildingItems] = useState(false);
  const [, setRerenderCount] = useState(0);

  const registerImage = useCallback(
    (
      id: string,
      getFile: () => File | null,
      getUrl: () => string,
      onOptimized: (file: File) => void,
      onClear?: () => void,
    ) => {
      registryRef.current.set(id, { getFile, getUrl, onOptimized, onClear });
      setRerenderCount((c) => c + 1);
    },
    [],
  );

  const unregisterImage = useCallback((id: string) => {
    registryRef.current.delete(id);
    setRerenderCount((c) => c + 1);
  }, []);

  const contextValue: ImageGroupContextType = {
    formatBytes,
    deriveFormat,
    createObjectUrl,
    registerImage,
    unregisterImage,
  };

  // Determine if group is in dynamic mode (has onAdd and fixed is not explicitly true)
  const isDynamic = !fixed && typeof onAdd === "function";

  // Check if any registered inputs currently have an image
  let hasAnyImage = false;
  for (const entry of registryRef.current.values()) {
    if (entry.getFile() || entry.getUrl()) {
      hasAnyImage = true;
      break;
    }
  }

  const handleOptimizeAll = async () => {
    setIsBuildingItems(true);
    const items: OptimizationItem[] = [];

    for (const [id, entry] of registryRef.current.entries()) {
      const file = entry.getFile();
      const url = entry.getUrl();

      if (file) {
        items.push({ id, label: file.name, originalFile: file });
      } else if (url && !url.startsWith("blob:")) {
        const fetched = await urlToFile(url, `image-${id}`);
        if (fetched) {
          items.push({ id, label: url.split("/").pop() || url, originalFile: fetched });
        }
      }
    }

    setIsBuildingItems(false);

    if (items.length === 0) return;

    setModalItems(items);
    setIsModalOpen(true);
  };

  const handleModalSave = (optimizedFilesMap: Record<string, File>) => {
    for (const [id, optimizedFile] of Object.entries(optimizedFilesMap)) {
      const entry = registryRef.current.get(id);
      if (entry) {
        entry.onOptimized(optimizedFile);
      }
    }
  };

  const handleClearOrRemoveAll = () => {
    if (isDynamic && onRemoveAll) {
      onRemoveAll();
      return;
    }

    if (onClearAll) {
      onClearAll();
      return;
    }

    // Default: iterate registered inputs and clear them
    for (const entry of registryRef.current.values()) {
      if (entry.onClear) {
        entry.onClear();
      }
    }
  };

  const layoutContainerClass =
    layout === "wrap"
      ? "flex flex-wrap gap-4"
      : layout === "grid"
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        : "space-y-4";

  return (
    <ImageGroupContext.Provider value={contextValue}>
      <div
        className={`space-y-4 p-5 rounded-2xl border border-dashboard-border bg-dashboard-card shadow-xs ${className}`}
      >
        {/* Header row with Title, Description, and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-1 border-b border-dashboard-border-subtle">
          <div className="space-y-1">
            {title &&
              (typeof title === "string" ? (
                <h4 className="text-sm font-bold text-dashboard-fg">
                  {title}
                </h4>
              ) : (
                title
              ))}
            {description && (
              <p className="text-xs text-dashboard-muted">
                {description}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
            {/* Add Image Button (Dynamic Mode) */}
            {isDynamic && (
              <button
                type="button"
                onClick={onAdd}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>{addLabel}</span>
              </button>
            )}

            {/* Remove / Clear All Button */}
            {(hasAnyImage || onRemoveAll || onClearAll) && (
              <button
                type="button"
                onClick={handleClearOrRemoveAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashboard-border bg-dashboard-danger-subtle text-dashboard-danger hover:bg-dashboard-danger hover:text-dashboard-danger-fg text-xs font-semibold transition-all cursor-pointer"
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
                <span>{isDynamic ? "Remove All" : "Clear All"}</span>
              </button>
            )}

            {/* Optimize All Images Button */}
            <button
              type="button"
              onClick={handleOptimizeAll}
              disabled={isBuildingItems || !hasAnyImage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashboard-border bg-dashboard-accent-subtle text-dashboard-accent-fg text-xs font-semibold hover:bg-dashboard-accent/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isBuildingItems ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  <span>Optimize All Images</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Children Layout */}
        <div className={layoutContainerClass}>{children}</div>
      </div>

      {/* Batch Optimization Modal */}
      <ImageOptimizeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        items={modalItems}
        onSave={handleModalSave}
        title="Optimize All Images"
      />
    </ImageGroupContext.Provider>
  );
}

export default ImageInputGroup;
