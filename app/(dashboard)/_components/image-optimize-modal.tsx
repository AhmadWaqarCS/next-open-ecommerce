"use client";

import { useEffect, useState, useId } from "react";
import Image from "next/image";
import Modal from "./modal";
import { formatBytes, deriveFormat } from "./image-input-group";
import {
  ImageFormat,
  ImageOptimizationSettings,
  DEFAULT_OPTIMIZATION_SETTINGS,
  getImageDimensions,
  optimizeSingleImage,
} from "@/lib/image-optimizer";

export interface OptimizationItem {
  id: string;
  label?: string;
  originalFile: File;
}

export interface ImageOptimizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: OptimizationItem[];
  onSave: (optimizedFilesMap: Record<string, File>) => void;
  title?: string;
}

interface ResultData {
  file: File;
  dimensions: { width: number; height: number };
  originalDimensions: { width: number; height: number };
}

export function ImageOptimizeModal({
  isOpen,
  onClose,
  items,
  onSave,
  title,
}: ImageOptimizeModalProps) {
  const qualityInputId = useId();
  const formatInputId = useId();
  const maxSizeInputId = useId();
  const maxWidthInputId = useId();
  const maxHeightInputId = useId();
  const customWidthInputId = useId();
  const customHeightInputId = useId();
  const stripMetadataInputId = useId();

  const [settings, setSettings] = useState<ImageOptimizationSettings>(
    DEFAULT_OPTIMIZATION_SETTINGS,
  );
  const [activeItemId, setActiveItemId] = useState<string>("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [results, setResults] = useState<Record<string, ResultData>>({});
  const [originalDimensions, setOriginalDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [previewUrls, setPreviewUrls] = useState<
    Record<string, { original: string; optimized: string }>
  >({});

  // Initialize modal state when items open — load previews & dimensions only, no auto-compress
  useEffect(() => {
    if (!isOpen || items.length === 0) return;

    setActiveItemId(items[0].id);
    setResults({});

    const newPreviews: Record<string, { original: string; optimized: string }> = {};
    const newDims: Record<string, { width: number; height: number }> = {};
    let isSubscribed = true;

    async function loadDimensions() {
      for (const item of items) {
        const origUrl = URL.createObjectURL(item.originalFile);
        newPreviews[item.id] = { original: origUrl, optimized: "" };
        try {
          const dims = await getImageDimensions(item.originalFile);
          if (isSubscribed) newDims[item.id] = dims;
        } catch {
          if (isSubscribed) newDims[item.id] = { width: 0, height: 0 };
        }
      }
      if (isSubscribed) {
        setPreviewUrls(newPreviews);
        setOriginalDimensions(newDims);
      }
    }

    loadDimensions();

    return () => {
      isSubscribed = false;
      Object.values(newPreviews).forEach((p) => {
        if (p.original) URL.revokeObjectURL(p.original);
        if (p.optimized) URL.revokeObjectURL(p.optimized);
      });
    };
  }, [isOpen, items]);

  // Update the optimized preview URL for a specific item
  const updateOptimizedPreview = (itemId: string, optimizedFile: File) => {
    const optUrl = URL.createObjectURL(optimizedFile);
    setPreviewUrls((prev) => {
      const existing = prev[itemId];
      if (existing?.optimized) URL.revokeObjectURL(existing.optimized);
      return {
        ...prev,
        [itemId]: { original: existing?.original || "", optimized: optUrl },
      };
    });
  };

  // Manual optimize — always from original files, never from previous compressed output
  const handleOptimize = async () => {
    if (items.length === 0) return;
    setIsOptimizing(true);

    const newResults: Record<string, ResultData> = { ...results };

    for (const item of items) {
      try {
        const optimizedFile = await optimizeSingleImage(item.originalFile, settings);
        const dims = await getImageDimensions(optimizedFile);
        const origDims = originalDimensions[item.id] || { width: 0, height: 0 };

        newResults[item.id] = {
          file: optimizedFile,
          dimensions: dims,
          originalDimensions: origDims,
        };

        updateOptimizedPreview(item.id, optimizedFile);
      } catch (err) {
        console.error(`Failed to optimize image ${item.id}:`, err);
      }
    }

    setResults(newResults);
    setIsOptimizing(false);
  };

  const handleSave = () => {
    const mapToSave: Record<string, File> = {};
    items.forEach((item) => {
      const res = results[item.id];
      if (res?.file) mapToSave[item.id] = res.file;
    });
    onSave(mapToSave);
    onClose();
  };

  const activeItem = items.find((i) => i.id === activeItemId) || items[0];
  const activeResult = activeItem ? results[activeItem.id] : null;
  const activePreview = activeItem ? previewUrls[activeItem.id] : null;
  const activeOrigDims = activeItem ? originalDimensions[activeItem.id] : null;

  const isMulti = items.length > 1;

  const calculateSavings = (origSize: number, optSize: number) => {
    if (!origSize || !optSize || origSize === 0) return 0;
    return Math.round(((origSize - optSize) / origSize) * 100);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl p-6">
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>{title || (isMulti ? "Optimize All Images" : "Image Optimization Pipeline")}</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                Client-Side
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Configure settings below, then click <strong>Optimize</strong>. Re-runs always compress from the original source file.
            </p>
          </div>
        </div>

        {/* ── Multi-Item Tabs ── */}
        {isMulti && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-200 dark:border-zinc-800">
            {items.map((item, idx) => {
              const res = results[item.id];
              const isSelected = item.id === activeItemId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveItemId(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-600 text-white font-semibold shadow-sm"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  <span className="truncate max-w-[140px]">
                    {item.label || item.originalFile.name || `Image #${idx + 1}`}
                  </span>
                  {res && (
                    <span className="text-[10px] opacity-80 font-mono">
                      {formatBytes(res.file.size)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Compression Settings (full width) ── */}
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3">
            Compression Settings
          </h4>

          {/* Row 1: Format · Quality · Max Size */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {/* Output Format */}
            <div>
              <label
                htmlFor={formatInputId}
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Output Format
              </label>
              <select
                id={formatInputId}
                value={settings.format}
                onChange={(e) =>
                  setSettings({ ...settings, format: e.target.value as ImageFormat })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-medium"
              >
                <option value="image/webp">WebP — Recommended</option>
                <option value="image/jpeg">JPEG — Standard Photo</option>
                <option value="image/avif">AVIF — Next-Gen</option>
                <option value="image/png">PNG — Lossless</option>
                <option value="original">Keep Original Format</option>
              </select>
            </div>

            {/* Quality */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label
                  htmlFor={qualityInputId}
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Quality
                </label>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                  {Math.round(settings.quality * 100)}%
                </span>
              </div>
              <input
                id={qualityInputId}
                type="range"
                min="0.10"
                max="1.00"
                step="0.05"
                value={settings.quality}
                onChange={(e) =>
                  setSettings({ ...settings, quality: parseFloat(e.target.value) })
                }
                className="w-full accent-emerald-600 cursor-pointer mt-2"
              />
            </div>

            {/* Target Max Size */}
            <div>
              <label
                htmlFor={maxSizeInputId}
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Target Max Size (MB)
              </label>
              <input
                id={maxSizeInputId}
                type="number"
                min="0.1"
                max="20"
                step="0.1"
                value={settings.maxSizeMB}
                onChange={(e) =>
                  setSettings({ ...settings, maxSizeMB: parseFloat(e.target.value) || 1 })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono"
              />
            </div>
          </div>

          {/* Row 2: Dimensions + Metadata + Optimize button */}
          <div className="flex flex-wrap items-end gap-4 pt-3 border-t border-zinc-200 dark:border-zinc-700/60">
            {/* Aspect Ratio Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                Maintain Aspect Ratio
              </span>
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, preserveAspectRatio: !settings.preserveAspectRatio })
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  settings.preserveAspectRatio ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.preserveAspectRatio ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Dimension fields */}
            {settings.preserveAspectRatio ? (
              <>
                <div>
                  <label
                    htmlFor={maxWidthInputId}
                    className="block text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5"
                  >
                    Max Width (px)
                  </label>
                  <input
                    id={maxWidthInputId}
                    type="number"
                    placeholder="1920"
                    value={settings.maxWidth || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, maxWidth: parseInt(e.target.value, 10) || undefined })
                    }
                    className="w-28 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-xs"
                  />
                </div>
                <div>
                  <label
                    htmlFor={maxHeightInputId}
                    className="block text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5"
                  >
                    Max Height (px)
                  </label>
                  <input
                    id={maxHeightInputId}
                    type="number"
                    placeholder="1080"
                    value={settings.maxHeight || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, maxHeight: parseInt(e.target.value, 10) || undefined })
                    }
                    className="w-28 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-xs"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label
                    htmlFor={customWidthInputId}
                    className="block text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5"
                  >
                    Exact Width (px)
                  </label>
                  <input
                    id={customWidthInputId}
                    type="number"
                    placeholder={activeOrigDims?.width ? String(activeOrigDims.width) : "800"}
                    value={settings.customWidth || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, customWidth: parseInt(e.target.value, 10) || undefined })
                    }
                    className="w-28 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-xs"
                  />
                </div>
                <div>
                  <label
                    htmlFor={customHeightInputId}
                    className="block text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5"
                  >
                    Exact Height (px)
                  </label>
                  <input
                    id={customHeightInputId}
                    type="number"
                    placeholder={activeOrigDims?.height ? String(activeOrigDims.height) : "600"}
                    value={settings.customHeight || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, customHeight: parseInt(e.target.value, 10) || undefined })
                    }
                    className="w-28 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-xs"
                  />
                </div>
              </>
            )}

            {/* Strip Metadata */}
            <div className="flex items-center gap-1.5 pb-0.5">
              <input
                id={stripMetadataInputId}
                type="checkbox"
                checked={settings.stripMetadata}
                onChange={(e) =>
                  setSettings({ ...settings, stripMetadata: e.target.checked })
                }
                className="rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label
                htmlFor={stripMetadataInputId}
                className="text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none whitespace-nowrap"
              >
                Strip EXIF Metadata
              </label>
            </div>

            {/* Optimize Button — right aligned */}
            <div className="ml-auto">
              <button
                type="button"
                disabled={isOptimizing}
                onClick={handleOptimize}
                className="inline-flex items-center gap-2 py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {isOptimizing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Optimizing{isMulti ? " All" : ""}...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                    </svg>
                    <span>
                      {Object.keys(results).length > 0
                        ? `Re-Optimize${isMulti ? " All" : ""}`
                        : `Optimize${isMulti ? " All Images" : " Image"}`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Side-by-Side Preview (below settings) ── */}
        {activeItem && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Original Card */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-white dark:bg-zinc-900 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Original
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {deriveFormat(activeItem.originalFile)}
                </span>
              </div>

              <div className="relative w-full h-52 rounded-lg overflow-hidden border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                {activePreview?.original ? (
                  <Image
                    src={activePreview.original}
                    alt="Original preview"
                    fill
                    className="object-contain"
                  />
                ) : (
                  <span className="text-xs text-zinc-400">Loading preview...</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase text-zinc-400 block">Size</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {formatBytes(activeItem.originalFile.size)}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase text-zinc-400 block">Dimensions</span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {activeOrigDims?.width && activeOrigDims?.height
                      ? `${activeOrigDims.width} × ${activeOrigDims.height}`
                      : "Fetching..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Optimized Card */}
            <div className="border border-emerald-300/50 dark:border-emerald-800/60 rounded-xl p-3 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Optimized
                </span>
                {activeResult && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-600 text-white">
                    {deriveFormat(activeResult.file)}
                  </span>
                )}
              </div>

              <div className="relative w-full h-52 rounded-lg overflow-hidden border border-emerald-200/40 dark:border-emerald-900/40 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                {isOptimizing ? (
                  <div className="flex flex-col items-center gap-2">
                    <svg className="animate-spin h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-xs text-emerald-600 font-medium animate-pulse">
                      Compressing...
                    </span>
                  </div>
                ) : activePreview?.optimized ? (
                  <Image
                    src={activePreview.optimized}
                    alt="Optimized preview"
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="text-center px-4">
                    <svg className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    <p className="text-xs text-zinc-400">
                      Configure settings above,<br />then click <strong className="text-zinc-600 dark:text-zinc-300">Optimize</strong>
                    </p>
                  </div>
                )}
              </div>

              {activeResult ? (
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase text-zinc-400 block">Size</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatBytes(activeResult.file.size)}
                      </span>
                      {calculateSavings(activeItem.originalFile.size, activeResult.file.size) > 0 && (
                        <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300">
                          -{calculateSavings(activeItem.originalFile.size, activeResult.file.size)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase text-zinc-400 block">Dimensions</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {activeResult.dimensions.width > 0
                        ? `${activeResult.dimensions.width} × ${activeResult.dimensions.height}`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-[38px] flex items-center text-xs text-zinc-400 font-mono">
                  Awaiting optimization...
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Footer Actions ── */}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={Object.keys(results).length === 0 || isOptimizing}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span>{isMulti ? "Save All Optimized Images" : "Save Optimized Image"}</span>
          </button>
        </div>

      </div>
    </Modal>
  );
}

export default ImageOptimizeModal;
