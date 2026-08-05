"use client";

import React, { createContext, useContext } from "react";

export interface ImageGroupContextType {
  formatBytes: (bytes: number, decimals?: number) => string;
  deriveFormat: (
    file?: File | null,
    url?: string,
    contentType?: string | null,
  ) => string;
  fetchImageSpecs: (url: string) => Promise<{
    size: number | null;
    format: string | null;
    error: string | null;
  }>;
  createObjectUrl: (file: File) => string;
}

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

const defaultContext: ImageGroupContextType = {
  formatBytes,
  deriveFormat,
  fetchImageSpecs,
  createObjectUrl,
};

const ImageGroupContext = createContext<ImageGroupContextType>(defaultContext);

export function useImageGroupContext(): ImageGroupContextType {
  return useContext(ImageGroupContext);
}

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

export function ImageInputGroup({
  title,
  description,
  className = "",
  children,
}: ImageInputGroupProps) {
  return (
    <ImageGroupContext.Provider value={defaultContext}>
      <div
        className={`space-y-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 ${className}`}
      >
        {(title || description) && (
          <div className="space-y-1 pb-1">
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
        )}

        <div className="space-y-4">{children}</div>
      </div>
    </ImageGroupContext.Provider>
  );
}

export default ImageInputGroup;
