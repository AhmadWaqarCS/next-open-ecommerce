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
  /** Register a child image input so the group can batch-optimize it */
  registerImage: (
    id: string,
    getFile: () => File | null,
    getUrl: () => string,
    onOptimized: (file: File) => void,
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
  /** Inner ImageInput component(s) */
  children: React.ReactNode;
}

// ─── ImageInputGroup Component ────────────────────────────────────────────────

export function ImageInputGroup({
  title,
  description,
  className = "",
  children,
}: ImageInputGroupProps) {
  const registryRef = useRef<Map<string, RegisteredImageEntry>>(new Map());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalItems, setModalItems] = useState<OptimizationItem[]>([]);
  const [isBuildingItems, setIsBuildingItems] = useState(false);

  const registerImage = useCallback(
    (
      id: string,
      getFile: () => File | null,
      getUrl: () => string,
      onOptimized: (file: File) => void,
    ) => {
      registryRef.current.set(id, { getFile, getUrl, onOptimized });
    },
    [],
  );

  const unregisterImage = useCallback((id: string) => {
    registryRef.current.delete(id);
  }, []);

  const contextValue: ImageGroupContextType = {
    formatBytes,
    deriveFormat,
    createObjectUrl,
    registerImage,
    unregisterImage,
  };

  const handleOptimizeAll = async () => {
    setIsBuildingItems(true);
    const items: OptimizationItem[] = [];

    for (const [id, entry] of registryRef.current.entries()) {
      const file = entry.getFile();
      const url = entry.getUrl();

      if (file) {
        // Staged local file: use directly as original
        items.push({ id, label: file.name, originalFile: file });
      } else if (url && !url.startsWith("blob:")) {
        // Existing URL image: fetch and convert to File
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

  // Count registered images for conditional rendering of the "Optimize All" button
  const registrySize = registryRef.current.size;

  return (
    <ImageGroupContext.Provider value={contextValue}>
      <div
        className={`space-y-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 ${className}`}
      >
        {/* Header row — always renders (title/desc optional, Optimize All always shown) */}
        <div className="flex items-start justify-between gap-3 pb-1">
          <div className="space-y-1">
            {title &&
              (typeof title === "string" ? (
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {title}
                </h4>
              ) : (
                title
              ))}
            {description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
            )}
          </div>

          {/* Optimize All Images button */}
          <button
            type="button"
            onClick={handleOptimizeAll}
            disabled={isBuildingItems}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-400/50 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all cursor-pointer disabled:opacity-50"
          >
            {isBuildingItems ? (
              <>
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span>Optimize All Images</span>
              </>
            )}
          </button>
        </div>

        <div className="space-y-4">{children}</div>
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
