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

function calculateSavings(origSize: number, optSize: number): number {
  if (!origSize || !optSize || origSize === 0) return 0;
  return Math.round(((origSize - optSize) / origSize) * 100);
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
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [results, setResults] = useState<Record<string, ResultData>>({});
  const [originalDimensions, setOriginalDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [previewUrls, setPreviewUrls] = useState<
    Record<string, { original: string; optimized: string }>
  >({});

  // Initialize modal state when items open
  useEffect(() => {
    if (!isOpen || items.length === 0) return;

    setActiveItemId(items[0].id);
    setSelectedItemIds(new Set(items.map((i) => i.id)));
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

  const handleToggleSelect = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedItemIds.size === items.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(items.map((i) => i.id)));
    }
  };

  // Run optimization on selected items (or all items if selected is empty or all checked)
  const handleOptimize = async () => {
    if (items.length === 0) return;
    const targetItems =
      selectedItemIds.size > 0
        ? items.filter((i) => selectedItemIds.has(i.id))
        : items;

    if (targetItems.length === 0) return;

    setIsOptimizing(true);
    const newResults: Record<string, ResultData> = { ...results };

    for (const item of targetItems) {
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
  const targetCount = selectedItemIds.size > 0 ? selectedItemIds.size : items.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl p-6 bg-dashboard-card border-dashboard-border">
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-dashboard-border-subtle pb-4">
          <div>
            <h3 className="text-base font-bold text-dashboard-fg flex items-center gap-2">
              <span>{title || (isMulti ? "Optimize All Images" : "Image Optimization Pipeline")}</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent/30">
                Client-Side
              </span>
            </h3>
            <p className="text-xs text-dashboard-muted mt-0.5">
              Select images, configure compression parameters below, and click <strong>Optimize</strong>. Re-compressions always use the original source file.
            </p>
          </div>
        </div>

        {/* ── Section 1: All Images Overview ── */}
        {isMulti && (
          <div className="space-y-2 border-b border-dashboard-border-subtle pb-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-dashboard-muted">
                Images ({items.length})
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-dashboard-primary hover:underline font-semibold cursor-pointer"
              >
                {selectedItemIds.size === items.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
              {items.map((item, idx) => {
                const res = results[item.id];
                const isSelected = selectedItemIds.has(item.id);
                const isActive = item.id === activeItemId;
                const prev = previewUrls[item.id];

                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveItemId(item.id)}
                    className={`shrink-0 flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                      isActive
                        ? "border-dashboard-primary bg-dashboard-accent-subtle/40 shadow-xs"
                        : "border-dashboard-border bg-dashboard-muted-bg/40 hover:bg-dashboard-card-hover"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(item.id);
                      }}
                      className="rounded border-dashboard-border text-dashboard-primary focus:ring-dashboard-primary cursor-pointer"
                    />

                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-dashboard-border bg-dashboard-card shrink-0">
                      {prev?.original && (
                        <Image
                          src={prev.original}
                          alt={item.label || "Thumb"}
                          fill
                          className="object-contain"
                        />
                      )}
                    </div>

                    <div className="max-w-[130px] truncate">
                      <p className="font-semibold text-dashboard-fg truncate">
                        {item.label || item.originalFile.name || `Image #${idx + 1}`}
                      </p>
                      <p className="text-[10px] text-dashboard-muted font-mono truncate">
                        {res ? (
                          <span className="text-dashboard-accent-fg font-bold">
                            {formatBytes(res.file.size)}
                          </span>
                        ) : (
                          formatBytes(item.originalFile.size)
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Section 2: Global Configuration Section ── */}
        <div className="p-4 rounded-xl bg-dashboard-muted-bg/40 border border-dashboard-border space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-dashboard-primary">
              Optimization Settings
            </h4>
            <span className="text-[11px] text-dashboard-muted">
              Applies to {targetCount} selected {targetCount === 1 ? "image" : "images"}
            </span>
          </div>

          {/* Row 1: Format · Quality · Target Max Size */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Output Format */}
            <div>
              <label
                htmlFor={formatInputId}
                className="block text-xs font-semibold text-dashboard-fg mb-1"
              >
                Output Format
              </label>
              <select
                id={formatInputId}
                value={settings.format}
                onChange={(e) =>
                  setSettings({ ...settings, format: e.target.value as ImageFormat })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-dashboard-border bg-dashboard-card text-dashboard-fg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-dashboard-primary"
              >
                <option value="image/webp">WebP — Recommended</option>
                <option value="image/jpeg">JPEG — Standard Photo</option>
                <option value="image/avif">AVIF — Next-Gen</option>
                <option value="image/png">PNG — Lossless</option>
                <option value="original">Keep Original Format</option>
              </select>
            </div>

            {/* Quality Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label
                  htmlFor={qualityInputId}
                  className="block text-xs font-semibold text-dashboard-fg"
                >
                  Quality
                </label>
                <span className="font-mono font-bold text-dashboard-primary text-xs">
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
                className="w-full accent-dashboard-primary cursor-pointer mt-2"
              />
            </div>

            {/* Target Max Size */}
            <div>
              <label
                htmlFor={maxSizeInputId}
                className="block text-xs font-semibold text-dashboard-fg mb-1"
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
                className="w-full px-3 py-1.5 rounded-lg border border-dashboard-border bg-dashboard-card text-dashboard-fg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-dashboard-primary"
              />
            </div>
          </div>

          {/* Row 2: Dimensions · EXIF Toggle · Optimize Trigger */}
          <div className="flex flex-wrap items-end gap-4 pt-3 border-t border-dashboard-border-subtle">
            {/* Maintain Aspect Ratio Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-dashboard-fg whitespace-nowrap">
                Maintain Aspect Ratio
              </span>
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, preserveAspectRatio: !settings.preserveAspectRatio })
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  settings.preserveAspectRatio ? "bg-dashboard-primary" : "bg-dashboard-border"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-dashboard-card shadow-xs ring-0 transition duration-200 ease-in-out ${
                    settings.preserveAspectRatio ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Dimension Fields */}
            {settings.preserveAspectRatio ? (
              <>
                <div>
                  <label
                    htmlFor={maxWidthInputId}
                    className="block text-[10px] text-dashboard-muted mb-0.5"
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
                    className="w-24 px-2.5 py-1 rounded-lg border border-dashboard-border bg-dashboard-card text-dashboard-fg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-dashboard-primary"
                  />
                </div>
                <div>
                  <label
                    htmlFor={maxHeightInputId}
                    className="block text-[10px] text-dashboard-muted mb-0.5"
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
                    className="w-24 px-2.5 py-1 rounded-lg border border-dashboard-border bg-dashboard-card text-dashboard-fg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-dashboard-primary"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label
                    htmlFor={customWidthInputId}
                    className="block text-[10px] text-dashboard-muted mb-0.5"
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
                    className="w-24 px-2.5 py-1 rounded-lg border border-dashboard-border bg-dashboard-card text-dashboard-fg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-dashboard-primary"
                  />
                </div>
                <div>
                  <label
                    htmlFor={customHeightInputId}
                    className="block text-[10px] text-dashboard-muted mb-0.5"
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
                    className="w-24 px-2.5 py-1 rounded-lg border border-dashboard-border bg-dashboard-card text-dashboard-fg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-dashboard-primary"
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
                className="rounded border-dashboard-border text-dashboard-primary focus:ring-dashboard-primary cursor-pointer"
              />
              <label
                htmlFor={stripMetadataInputId}
                className="text-xs text-dashboard-fg cursor-pointer select-none whitespace-nowrap"
              >
                Strip EXIF
              </label>
            </div>

            {/* Optimize Button */}
            <div className="ml-auto">
              <button
                type="button"
                disabled={isOptimizing || targetCount === 0}
                onClick={handleOptimize}
                className="inline-flex items-center gap-2 py-2 px-5 rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {isOptimizing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-dashboard-primary-fg shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Optimizing {targetCount} {targetCount === 1 ? "Image" : "Images"}...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    <span>
                      {Object.keys(results).length > 0
                        ? `Re-Optimize (${targetCount})`
                        : `Optimize (${targetCount})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Section 3: Side-by-Side Inspector (Active Item) ── */}
        {activeItem && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Original Card */}
            <div className="border border-dashboard-border rounded-xl p-3 bg-dashboard-card space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-dashboard-muted">
                  Original Source
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-dashboard-muted-bg text-dashboard-fg border border-dashboard-border">
                  {deriveFormat(activeItem.originalFile)}
                </span>
              </div>

              <div className="relative w-full h-48 rounded-lg overflow-hidden border border-dashboard-border-subtle bg-dashboard-muted-bg flex items-center justify-center">
                {activePreview?.original ? (
                  <Image
                    src={activePreview.original}
                    alt="Original preview"
                    fill
                    className="object-contain"
                  />
                ) : (
                  <span className="text-xs text-dashboard-muted">Loading preview...</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase text-dashboard-muted block">Size</span>
                  <span className="font-semibold text-dashboard-fg">
                    {formatBytes(activeItem.originalFile.size)}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase text-dashboard-muted block">Dimensions</span>
                  <span className="text-dashboard-muted">
                    {activeOrigDims?.width && activeOrigDims?.height
                      ? `${activeOrigDims.width} × ${activeOrigDims.height} px`
                      : "Fetching..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Optimized Card */}
            <div className="border border-dashboard-accent/40 rounded-xl p-3 bg-dashboard-accent-subtle/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-dashboard-accent-fg">
                  Optimized Output
                </span>
                {activeResult && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-dashboard-primary text-dashboard-primary-fg">
                    {deriveFormat(activeResult.file)}
                  </span>
                )}
              </div>

              <div className="relative w-full h-48 rounded-lg overflow-hidden border border-dashboard-border bg-dashboard-card flex items-center justify-center">
                {isOptimizing ? (
                  <div className="flex flex-col items-center gap-2">
                    <svg className="animate-spin h-6 w-6 text-dashboard-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-xs text-dashboard-primary font-medium animate-pulse">
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
                    <svg className="w-8 h-8 text-dashboard-muted mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    <p className="text-xs text-dashboard-muted">
                      Click <strong className="text-dashboard-fg">Optimize</strong> to run compression
                    </p>
                  </div>
                )}
              </div>

              {activeResult ? (
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase text-dashboard-muted block">Size</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-dashboard-accent-fg">
                        {formatBytes(activeResult.file.size)}
                      </span>
                      {calculateSavings(activeItem.originalFile.size, activeResult.file.size) > 0 && (
                        <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent/30">
                          -{calculateSavings(activeItem.originalFile.size, activeResult.file.size)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase text-dashboard-muted block">Dimensions</span>
                    <span className="text-dashboard-fg">
                      {activeResult.dimensions.width > 0
                        ? `${activeResult.dimensions.width} × ${activeResult.dimensions.height} px`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-[38px] flex items-center text-xs text-dashboard-muted font-mono">
                  Awaiting optimization...
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Section 4: Modal Footer Actions ── */}
        <div className="flex items-center justify-end gap-2 border-t border-dashboard-border-subtle pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-dashboard-border bg-dashboard-card text-dashboard-fg text-xs font-semibold hover:bg-dashboard-card-hover transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={Object.keys(results).length === 0 || isOptimizing}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
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
