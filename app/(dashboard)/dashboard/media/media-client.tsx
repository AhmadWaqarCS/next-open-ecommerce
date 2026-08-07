"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { CRUD } from "@/lib/types";
import {
  StorageFileItem,
  DBImageRecord,
  AnalysisResult,
  formatBytes,
  extractFileKeyFromUrl,
} from "@/lib/media-types";
import {
  fetchStorageFilesAction,
  fetchDBImageUrlsAction,
  deleteMediaAction,
  bulkDeleteMediaAction,
  uploadMediaImage,
  replaceOptimizedImageAction,
} from "@/actions/media-actions";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import {
  ImageOptimizeModal,
  OptimizationItem,
} from "@/app/(dashboard)/_components/image-optimize-modal";
import {
  fetchImageSpecs,
  deriveFormat,
} from "@/app/(dashboard)/_components/image-input-group";
import { urlToFile } from "@/lib/image-optimizer";

interface MediaClientProps {
  permissions: CRUD;
}

interface DisplayedMediaItem {
  id: string; // unique ID
  url: string;
  fileKey: string;
  storageMedium?: string;
  storageName?: string;
  fileName: string;
  subfolder?: string;
  dbRecords?: DBImageRecord[];
  isOrphaned?: boolean;
  isBroken?: boolean;
  isConnected?: boolean;
  sizeBytes?: number;
}

const STORAGE_MEDIUMS = [
  { key: "local", name: "Uploads Storage", icon: "💻" },
  { key: "google_cloud", name: "Google Cloud", icon: "☁️" },
  { key: "aws_s3", name: "Amazon S3", icon: "📦" },
  { key: "cloudflare_r2", name: "Cloudflare R2", icon: "⚡" },
  { key: "minio", name: "MinIO Storage", icon: "🛢️" },
];

const ITEMS_PER_PAGE = 24;

/**
 * Subcomponent for individual media card that calculates file size & extension via fetchImageSpecs just like ImageInput.
 */
function MediaCardItem({
  item,
  isSelected,
  onToggleSelect,
  onOpenDetails,
  onOpenOptimize,
  onOpenDelete,
  canDelete,
}: {
  item: DisplayedMediaItem;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpenDetails: () => void;
  onOpenOptimize: (domImg?: HTMLImageElement | null) => void;
  onOpenDelete: () => void;
  canDelete: boolean;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [fileSize, setFileSize] = useState<number | null>(
    item.sizeBytes ?? null,
  );
  const [fileFormat, setFileFormat] = useState<string>(
    deriveFormat(null, item.url),
  );
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!item.isBroken && fileSize === null && item.url) {
      setIsCalculating(true);
      fetchImageSpecs(item.url).then((specs) => {
        if (!cancelled) {
          if (specs.size !== null) setFileSize(specs.size);
          if (specs.format) setFileFormat(specs.format);
          setIsCalculating(false);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [item.url, item.isBroken, fileSize]);

  const displaySize = item.isBroken
    ? "N/A"
    : fileSize !== null
      ? formatBytes(fileSize)
      : isCalculating
        ? "Calculating..."
        : "—";

  return (
    <div
      className={`group relative bg-white dark:bg-zinc-900 rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
        isSelected
          ? "border-indigo-500 ring-2 ring-indigo-500/20"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      {/* Image Preview Thumbnail */}
      <div
        onClick={onOpenDetails}
        className="relative aspect-square w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center cursor-pointer"
      >
        {item.isBroken ? (
          <div className="text-center p-3">
            <span className="text-2xl">⚠️</span>
            <p className="text-[10px] text-rose-500 font-semibold mt-1">
              Broken Link
            </p>
          </div>
        ) : (
          <img
            ref={imgRef}
            src={item.url}
            alt={item.fileName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        )}

        {/* Selection Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 left-2 z-10 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700 shadow-sm"
        />

        {/* Extension Badge */}
        <span className="absolute bottom-2 left-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/60 text-white backdrop-blur-xs">
          {fileFormat}
        </span>

        {/* Connectivity Badge */}
        <div className="absolute top-2 right-2 z-10">
          {item.isConnected && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-white shadow-xs">
              Connected
            </span>
          )}
          {item.isOrphaned && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white shadow-xs">
              Orphan
            </span>
          )}
          {item.isBroken && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500 text-white shadow-xs">
              Broken DB
            </span>
          )}
        </div>
      </div>

      {/* Card Details & Actions */}
      <div className="p-3 space-y-1.5 text-[11px] flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-1">
            <p
              onClick={onOpenDetails}
              className="font-semibold text-zinc-900 dark:text-zinc-100 truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
              title={item.fileName}
            >
              {item.fileName}
            </p>
          </div>
          <p
            className="text-zinc-500 font-mono text-[10px] truncate"
            title={displaySize}
          >
            {displaySize}
          </p>
        </div>

        {/* DB entity tags if connected */}
        {item.dbRecords && item.dbRecords.length > 0 && (
          <div className="space-y-0.5 pt-1">
            {item.dbRecords.slice(0, 2).map((r, idx) => (
              <div
                key={idx}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded truncate"
              >
                {r.table}: {r.entityName || `#${r.entityId}`}
              </div>
            ))}
            {item.dbRecords.length > 2 && (
              <div className="text-[9px] text-zinc-400">
                +{item.dbRecords.length - 2} more...
              </div>
            )}
          </div>
        )}

        {/* Card Action Buttons */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <button
            onClick={onOpenDetails}
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium text-[10px]"
          >
            Details
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenOptimize(imgRef.current)}
              disabled={item.isBroken}
              className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 font-medium text-[10px] disabled:opacity-40"
            >
              Optimize
            </button>

            {canDelete && !item.isBroken && (
              <button
                onClick={onOpenDelete}
                className="text-rose-600 hover:text-rose-500 dark:text-rose-400 font-medium text-[10px]"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MediaClient({ permissions }: MediaClientProps) {
  const { toast } = useToast();

  // Storage files state (keyed by storage medium)
  const [storageFilesMap, setStorageFilesMap] = useState<
    Record<string, StorageFileItem[]>
  >({});
  const [loadedStorageKeys, setLoadedStorageKeys] = useState<Set<string>>(
    new Set(),
  );
  const [loadingStorageKey, setLoadingStorageKey] = useState<string | null>(
    null,
  );

  // DB images state
  const [dbImages, setDbImages] = useState<DBImageRecord[]>([]);
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  // Analysis state
  const [isAnalyzed, setIsAnalyzed] = useState(false);

  // Filter state
  const [activeTab, setActiveTab] = useState<
    "all" | "connected" | "orphaned" | "broken"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination / Infinite scroll state
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Upload state
  const [isUploading, setIsUploading] = useState(false);

  // Optimize modal state
  const [isOptimizeOpen, setIsOptimizeOpen] = useState(false);
  const [optimizeItems, setOptimizeItems] = useState<OptimizationItem[]>([]);
  const [isPreparingOptimize, setIsPreparingOptimize] = useState(false);
  const [optimizingUrlMap, setOptimizingUrlMap] = useState<
    Record<string, string>
  >({}); // item.id -> oldUrl

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<DisplayedMediaItem | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Detailed View Modal state
  const [detailTarget, setDetailTarget] = useState<DisplayedMediaItem | null>(
    null,
  );
  const [detailSize, setDetailSize] = useState<number | null>(null);
  const [detailFormat, setDetailFormat] = useState<string>("");
  const [isDetailSpecsLoading, setIsDetailSpecsLoading] = useState(false);

  // Load detailed specs when detail modal opens
  useEffect(() => {
    if (detailTarget && !detailTarget.isBroken) {
      setDetailFormat(deriveFormat(null, detailTarget.url));
      setIsDetailSpecsLoading(true);
      fetchImageSpecs(detailTarget.url).then((specs) => {
        if (specs.size !== null) setDetailSize(specs.size);
        if (specs.format) setDetailFormat(specs.format);
        setIsDetailSpecsLoading(false);
      });
    } else {
      setDetailSize(null);
      setDetailFormat("");
      setIsDetailSpecsLoading(false);
    }
  }, [detailTarget]);

  // Fetch files for a specific storage medium
  const handleFetchStorageMedium = async (key: string) => {
    setLoadingStorageKey(key);
    try {
      const res = await fetchStorageFilesAction(key);
      if (res.success && res.data) {
        const files = res.data.files;
        setStorageFilesMap((prev) => ({
          ...prev,
          [key]: files,
        }));
        setLoadedStorageKeys((prev) => new Set([...prev, key]));
        setIsAnalyzed(false); // Reset analysis if data changes
        toast(`Loaded ${files.length} files from ${key} storage.`, "success");
      } else {
        toast(res.message || `Failed to fetch files from ${key}.`, "error");
      }
    } catch (err: any) {
      toast(err?.message || "Error fetching storage files.", "error");
    } finally {
      setLoadingStorageKey(null);
    }
  };

  // Fetch all DB images
  const handleFetchDbImages = async () => {
    setIsLoadingDb(true);
    try {
      const res = await fetchDBImageUrlsAction();
      if (res.success && res.data) {
        setDbImages(res.data.images);
        setIsDbLoaded(true);
        setIsAnalyzed(false);
        toast(
          `Loaded ${res.data.images.length} image references from Database.`,
          "success",
        );
      } else {
        toast(res.message || "Failed to fetch DB image references.", "error");
      }
    } catch (err: any) {
      toast(err?.message || "Error fetching DB images.", "error");
    } finally {
      setIsLoadingDb(false);
    }
  };

  // Run client-side analysis
  const handleRunAnalysis = () => {
    setIsAnalyzed(true);
    toast(
      "Analysis completed: matched storage files against DB references.",
      "success",
    );
  };

  // Combine all loaded storage files
  const allStorageFiles = useMemo(() => {
    const list: StorageFileItem[] = [];
    for (const key of Array.from(loadedStorageKeys)) {
      if (storageFilesMap[key]) {
        list.push(...storageFilesMap[key]);
      }
    }
    return list;
  }, [storageFilesMap, loadedStorageKeys]);

  // Master list of displayed media items
  const masterItems = useMemo<DisplayedMediaItem[]>(() => {
    const items: DisplayedMediaItem[] = [];
    const dbKeyMap = new Map<string, DBImageRecord[]>();

    for (const rec of dbImages) {
      const key = extractFileKeyFromUrl(rec.url);
      if (key) {
        const existing = dbKeyMap.get(key) || [];
        existing.push(rec);
        dbKeyMap.set(key, existing);
      }
    }

    const matchedStorageKeys = new Set<string>();

    // Storage files
    for (const sf of allStorageFiles) {
      const key = extractFileKeyFromUrl(sf.url);
      matchedStorageKeys.add(key);

      const dbRecs = dbKeyMap.get(key);
      const isConn = Boolean(dbRecs && dbRecs.length > 0);
      const isOrph = !isConn;

      items.push({
        id: `storage-${sf.storageMedium}-${sf.key}`,
        url: sf.url,
        fileKey: sf.key,
        storageMedium: sf.storageMedium,
        storageName: sf.storageName,
        fileName: sf.fileName,
        subfolder: sf.subfolder,
        dbRecords: dbRecs,
        isConnected: isConn,
        isOrphaned: isOrph,
        isBroken: false,
      });
    }

    // Broken DB references (only added if DB is loaded)
    if (isDbLoaded) {
      const addedBrokenKeys = new Set<string>();
      for (const rec of dbImages) {
        const key = extractFileKeyFromUrl(rec.url);
        if (key && !matchedStorageKeys.has(key) && !addedBrokenKeys.has(key)) {
          addedBrokenKeys.add(key);
          const allRecs = dbKeyMap.get(key) || [];
          const parts = rec.url.split("/");
          const fileName = parts[parts.length - 1] || rec.url;

          items.push({
            id: `broken-${rec.url}`,
            url: rec.url,
            fileKey: rec.url,
            fileName,
            dbRecords: allRecs,
            isConnected: false,
            isOrphaned: false,
            isBroken: true,
          });
        }
      }
    }

    return items;
  }, [allStorageFiles, dbImages, isDbLoaded]);

  // Filtered items based on tab & search
  const filteredItems = useMemo(() => {
    return masterItems.filter((item) => {
      // Tab filter
      if (activeTab === "connected" && !item.isConnected) return false;
      if (activeTab === "orphaned" && !item.isOrphaned) return false;
      if (activeTab === "broken" && !item.isBroken) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.fileName.toLowerCase().includes(q);
        const matchUrl = item.url.toLowerCase().includes(q);
        const matchTable = item.dbRecords?.some(
          (r) =>
            r.table.toLowerCase().includes(q) ||
            r.entityName?.toLowerCase().includes(q),
        );
        if (!matchName && !matchUrl && !matchTable) return false;
      }

      return true;
    });
  }, [masterItems, activeTab, searchQuery]);

  // Items currently visible in scroll window
  const visibleItems = useMemo(() => {
    return filteredItems.slice(0, displayedCount);
  }, [filteredItems, displayedCount]);

  // Infinite scroll observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node) return;

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setDisplayedCount((prev) =>
            Math.min(prev + ITEMS_PER_PAGE, filteredItems.length),
          );
        }
      });

      observerRef.current.observe(node);
    },
    [filteredItems.length],
  );

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  // Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("file", files[i]);
      try {
        const res = await uploadMediaImage(formData, "media");
        if (res.success) {
          successCount++;
        } else {
          toast(`Failed to upload ${files[i].name}: ${res.message}`, "error");
        }
      } catch (err: any) {
        toast(`Error uploading ${files[i].name}`, "error");
      }
    }

    setIsUploading(false);
    if (successCount > 0) {
      toast(
        `Successfully uploaded ${successCount} file(s). Refreshing local disk...`,
        "success",
      );
      handleFetchStorageMedium("local");
    }
    e.target.value = "";
  };

  // Delete single file
  const handleDeleteSingle = async (item: DisplayedMediaItem) => {
    if (item.isBroken) {
      toast(
        "Broken database links cannot be deleted from storage (file does not exist on disk).",
        "error",
      );
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteMediaAction({ relativePath: item.url });
      if (res.success) {
        toast("File deleted from storage.", "success");
        setStorageFilesMap((prev) => {
          const next = { ...prev };
          if (item.storageMedium && next[item.storageMedium]) {
            next[item.storageMedium] = next[item.storageMedium].filter(
              (f) => f.url !== item.url,
            );
          }
          return next;
        });
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        if (detailTarget?.id === item.id) setDetailTarget(null);
      } else {
        toast(res.message || "Delete failed.", "error");
      }
    } catch (err: any) {
      toast(err?.message || "Delete failed.", "error");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Bulk delete selected
  const handleBulkDelete = async () => {
    const itemsToDelete = filteredItems.filter(
      (i) => selectedIds.has(i.id) && !i.isBroken,
    );
    if (itemsToDelete.length === 0) {
      toast("No non-broken files selected for deletion.", "error");
      return;
    }

    setIsBulkDeleting(true);
    try {
      const urls = itemsToDelete.map((i) => i.url);
      const res = await bulkDeleteMediaAction({ relativePaths: urls });
      if (res.success) {
        toast(
          `Deleted ${itemsToDelete.length} file(s) from storage.`,
          "success",
        );

        const deletedUrlSet = new Set(urls);
        setStorageFilesMap((prev) => {
          const next: Record<string, StorageFileItem[]> = {};
          for (const k of Object.keys(prev)) {
            next[k] = prev[k].filter((f) => !deletedUrlSet.has(f.url));
          }
          return next;
        });

        setSelectedIds(new Set());
      } else {
        toast(res.message || "Bulk delete failed.", "error");
      }
    } catch (err: any) {
      toast(err?.message || "Bulk delete failed.", "error");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Open single optimize
  const handleOpenSingleOptimize = async (
    item: DisplayedMediaItem,
    domImgElement?: HTMLImageElement | null,
  ) => {
    if (item.isBroken) {
      toast("Cannot optimize a broken image link.", "error");
      return;
    }

    setIsPreparingOptimize(true);
    try {
      const file = await urlToFile(item.url, item.fileName, domImgElement);
      if (!file) {
        toast("Failed to fetch image for optimization.", "error");
        return;
      }

      const optItem: OptimizationItem = {
        id: item.id,
        label: item.fileName,
        originalFile: file,
      };

      setOptimizeItems([optItem]);
      setOptimizingUrlMap({ [item.id]: item.url });
      setIsOptimizeOpen(true);
    } catch (err: any) {
      toast("Failed to prepare image for optimization.", "error");
    } finally {
      setIsPreparingOptimize(false);
    }
  };

  // Open bulk optimize
  const handleOpenBulkOptimize = async () => {
    const itemsToOpt = filteredItems.filter(
      (i) => selectedIds.has(i.id) && !i.isBroken,
    );
    if (itemsToOpt.length === 0) {
      toast("No non-broken files selected for optimization.", "error");
      return;
    }

    setIsPreparingOptimize(true);
    const preparedItems: OptimizationItem[] = [];
    const urlMap: Record<string, string> = {};

    for (const item of itemsToOpt) {
      try {
        const file = await urlToFile(item.url, item.fileName);
        if (file) {
          preparedItems.push({
            id: item.id,
            label: item.fileName,
            originalFile: file,
          });
          urlMap[item.id] = item.url;
        }
      } catch {
        // skip failed
      }
    }

    setIsPreparingOptimize(false);

    if (preparedItems.length === 0) {
      toast("Failed to prepare selected images for optimization.", "error");
      return;
    }

    setOptimizeItems(preparedItems);
    setOptimizingUrlMap(urlMap);
    setIsOptimizeOpen(true);
  };

  // Save optimized image callback from modal
  const handleSaveOptimizedFiles = async (
    optimizedFilesMap: Record<string, File>,
  ) => {
    let successCount = 0;

    for (const [id, file] of Object.entries(optimizedFilesMap)) {
      const oldUrl = optimizingUrlMap[id];
      if (!oldUrl) continue;

      const formData = new FormData();
      formData.append("oldUrl", oldUrl);
      formData.append("file", file);

      try {
        const res = await replaceOptimizedImageAction(formData);
        if (res.success && res.data) {
          successCount++;
          const newUrl = res.data.newUrl;

          // 1. Update storage files map
          setStorageFilesMap((prev) => {
            const next: Record<string, StorageFileItem[]> = {};
            for (const k of Object.keys(prev)) {
              next[k] = (prev[k] || []).map((sf) =>
                sf.url === oldUrl
                  ? {
                      ...sf,
                      url: newUrl,
                      key: res
                        .data!.newUrl.replace(/^\/uploads\//, "")
                        .replace(/^uploads\//, ""),
                      fileName: res.data!.fileName,
                    }
                  : sf,
              );
            }
            return next;
          });

          // 2. Update DB images list so oldUrl -> newUrl in client state
          const oldKey = extractFileKeyFromUrl(oldUrl);
          const newKey = extractFileKeyFromUrl(newUrl);
          setDbImages((prev) =>
            prev.map((rec) =>
              extractFileKeyFromUrl(rec.url) === oldKey
                ? { ...rec, url: newUrl }
                : rec,
            ),
          );

          if (detailTarget?.url === oldUrl) {
            setDetailTarget((prev) =>
              prev
                ? { ...prev, url: newUrl, fileName: res.data!.fileName }
                : null,
            );
          }
        } else {
          toast(
            res.message || `Failed to save optimized image ${file.name}`,
            "error",
          );
        }
      } catch (err: any) {
        toast(`Error saving optimized file ${file.name}`, "error");
      }
    }

    setIsOptimizeOpen(false);

    if (successCount > 0) {
      toast(
        `Successfully optimized and replaced ${successCount} image(s).`,
        "success",
      );

      // 3. Re-fetch DB records if DB was loaded to guarantee 100% database sync
      if (isDbLoaded) {
        fetchDBImageUrlsAction().then((dbRes) => {
          if (dbRes.success && dbRes.data) {
            setDbImages(dbRes.data.images);
          }
        });
      }
    }
  };

  // Copy URL to clipboard
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast("Image URL copied to clipboard!", "success");
  };

  // Counts for tabs
  const counts = useMemo(() => {
    let connected = 0;
    let orphaned = 0;
    let broken = 0;
    for (const item of masterItems) {
      if (item.isConnected) connected++;
      if (item.isOrphaned) orphaned++;
      if (item.isBroken) broken++;
    }
    return { all: masterItems.length, connected, orphaned, broken };
  }, [masterItems]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Media Gallery & Storage Inspector
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
            Lazy-load files from specific storage drivers or query DB
            references. Perform client-side analysis to identify orphaned
            storage files and broken image links.
          </p>
        </div>

        {permissions.create && (
          <label className="cursor-pointer px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors inline-flex items-center gap-2 self-start sm:self-auto">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            {isUploading ? "Uploading..." : "Upload New Media"}
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        )}
      </div>

      {/* Storage Load Controls Panel */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
            Data Source Loaders
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {loadedStorageKeys.size} driver(s) loaded •{" "}
            {isDbLoaded ? "DB Loaded" : "DB Not Loaded"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {STORAGE_MEDIUMS.map((m) => {
            const isLoaded = loadedStorageKeys.has(m.key);
            const isLoading = loadingStorageKey === m.key;

            return (
              <button
                key={m.key}
                onClick={() => handleFetchStorageMedium(m.key)}
                disabled={isLoading}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-2 ${
                  isLoaded
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-800"
                }`}
              >
                <span>{m.icon}</span>
                <span>
                  {isLoading
                    ? `Loading ${m.name}...`
                    : isLoaded
                      ? `${m.name} (${storageFilesMap[m.key]?.length || 0})`
                      : `Get ${m.name}`}
                </span>
                {isLoaded && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </button>
            );
          })}

          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />

          {/* DB Loader */}
          <button
            onClick={handleFetchDbImages}
            disabled={isLoadingDb}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-2 ${
              isDbLoaded
                ? "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-800"
            }`}
          >
            <span>🗄️</span>
            <span>
              {isLoadingDb
                ? "Loading DB..."
                : isDbLoaded
                  ? `Get DB Images (${dbImages.length})`
                  : "Get All DB Images"}
            </span>
            {isDbLoaded && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            )}
          </button>

          {/* Run Analysis Button (Active when both storage and DB are loaded) */}
          {loadedStorageKeys.size > 0 && isDbLoaded && (
            <button
              onClick={handleRunAnalysis}
              className={`ml-auto px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-2 ${
                isAnalyzed
                  ? "bg-purple-600 text-white"
                  : "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
              }`}
            >
              <span>🔍</span>
              <span>
                {isAnalyzed
                  ? "Re-run Match & Analysis"
                  : "Match & Analyze Storage vs DB"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      {masterItems.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => {
                setActiveTab("all");
                setDisplayedCount(ITEMS_PER_PAGE);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "all"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              All Items ({counts.all})
            </button>

            <button
              onClick={() => {
                setActiveTab("connected");
                setDisplayedCount(ITEMS_PER_PAGE);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === "connected"
                  ? "bg-emerald-600 text-white"
                  : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/40"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Connected ({counts.connected})
            </button>

            <button
              onClick={() => {
                setActiveTab("orphaned");
                setDisplayedCount(ITEMS_PER_PAGE);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === "orphaned"
                  ? "bg-amber-600 text-white"
                  : "text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-950/40"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Orphaned Storage ({counts.orphaned})
            </button>

            {isDbLoaded && (
              <button
                onClick={() => {
                  setActiveTab("broken");
                  setDisplayedCount(ITEMS_PER_PAGE);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === "broken"
                    ? "bg-rose-600 text-white"
                    : "text-rose-700 bg-rose-50 hover:bg-rose-100 dark:text-rose-400 dark:bg-rose-950/40"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Broken DB Links ({counts.broken})
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search filename or path..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
            />
            <svg
              className="w-4 h-4 absolute left-2.5 top-2 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Select All Scope Bar & Bulk Action Trigger */}
      {filteredItems.length > 0 && (
        <div className="flex items-center justify-between px-2 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="selectAllCheckbox"
              checked={
                selectedIds.size === filteredItems.length &&
                filteredItems.length > 0
              }
              onChange={handleSelectAllFiltered}
              className="rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700"
            />
            <label
              htmlFor="selectAllCheckbox"
              className="cursor-pointer font-medium"
            >
              Select All {filteredItems.length} filtered item(s)
            </label>
          </div>
          <div>
            Showing {visibleItems.length} of {filteredItems.length} matching
            files
          </div>
        </div>
      )}

      {/* Media Grid */}
      {masterItems.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center space-y-3">
          <div className="text-4xl">🖼️</div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No Media Data Loaded
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Click any of the storage medium buttons above (Uploads, Cloud, S3,
            etc.) or "Get All DB Images" to fetch media files on demand.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            No media files match your current search or tab filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {visibleItems.map((item) => {
            const isSelected = selectedIds.has(item.id);

            return (
              <MediaCardItem
                key={item.id}
                item={item}
                isSelected={isSelected}
                onToggleSelect={() => handleToggleSelect(item.id)}
                onOpenDetails={() => setDetailTarget(item)}
                onOpenOptimize={() => handleOpenSingleOptimize(item)}
                onOpenDelete={() => setDeleteTarget(item)}
                canDelete={Boolean(permissions.delete)}
              />
            );
          })}
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      {visibleItems.length < filteredItems.length && (
        <div
          ref={sentinelRef}
          className="py-6 text-center text-xs text-zinc-400"
        >
          Loading more media items...
        </div>
      )}

      {/* Sticky Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 px-6 py-3 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 text-xs">
          <span className="font-semibold">
            {selectedIds.size} file(s) selected
          </span>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

          <button
            onClick={handleOpenBulkOptimize}
            disabled={isPreparingOptimize}
            className="font-semibold hover:underline text-indigo-600 dark:text-indigo-400 flex items-center gap-1"
          >
            <span>⚡</span> Bulk Optimize ({selectedIds.size})
          </button>

          {permissions.delete && (
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="font-semibold hover:underline text-rose-600 dark:text-rose-400 flex items-center gap-1"
            >
              <span>🗑️</span>{" "}
              {isBulkDeleting
                ? "Deleting..."
                : `Bulk Delete (${selectedIds.size})`}
            </button>
          )}

          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Detailed View Modal */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-2xl w-full space-y-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>Image Detailed View</span>
                  {detailTarget.isConnected && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                      Connected
                    </span>
                  )}
                  {detailTarget.isOrphaned && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                      Orphaned Storage
                    </span>
                  )}
                  {detailTarget.isBroken && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                      Broken DB Reference
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-500 font-mono mt-0.5 truncate max-w-md">
                  {detailTarget.fileName}
                </p>
              </div>

              <button
                onClick={() => setDetailTarget(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-bold p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="overflow-y-auto space-y-6 flex-1 pr-1">
              {/* Image Preview Large */}
              <div className="w-full h-64 bg-zinc-100 dark:bg-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center border border-zinc-200 dark:border-zinc-700/60 relative">
                {detailTarget.isBroken ? (
                  <div className="text-center p-6">
                    <span className="text-4xl">⚠️</span>
                    <p className="text-xs text-rose-500 font-semibold mt-2">
                      Physical Image Missing from Storage
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-1 max-w-sm">
                      This image reference exists in the database, but no file
                      was found at this URL path.
                    </p>
                  </div>
                ) : (
                  <img
                    src={detailTarget.url}
                    alt={detailTarget.fileName}
                    className="max-w-full max-h-full object-contain"
                  />
                )}
              </div>

              {/* Detailed Specs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* File Name */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-zinc-400 text-[10px] font-medium uppercase tracking-wider block mb-1">
                    File Name
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono break-all">
                    {detailTarget.fileName}
                  </span>
                </div>

                {/* File Size */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-zinc-400 text-[10px] font-medium uppercase tracking-wider block mb-1">
                    File Size
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                    {detailTarget.isBroken
                      ? "N/A"
                      : isDetailSpecsLoading
                        ? "Calculating size..."
                        : detailSize !== null
                          ? `${formatBytes(detailSize)} (${detailSize.toLocaleString()} bytes)`
                          : "Unknown"}
                  </span>
                </div>

                {/* Extension / Format */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-zinc-400 text-[10px] font-medium uppercase tracking-wider block mb-1">
                    Extension / Format
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono uppercase">
                    {detailFormat || deriveFormat(null, detailTarget.url)}
                  </span>
                </div>

                {/* Storage Medium */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-zinc-400 text-[10px] font-medium uppercase tracking-wider block mb-1">
                    Storage Driver
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {detailTarget.storageName ||
                      detailTarget.storageMedium ||
                      "Local Disk"}
                  </span>
                </div>

                {/* Full Public URL */}
                <div className="sm:col-span-2 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between gap-3">
                  <div className="overflow-hidden">
                    <span className="text-zinc-400 text-[10px] font-medium uppercase tracking-wider block mb-1">
                      Public Image URL
                    </span>
                    <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 truncate block">
                      {detailTarget.url}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyUrl(detailTarget.url)}
                    className="shrink-0 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    Copy URL
                  </button>
                </div>

                {/* Database Connectivity Status & Records */}
                <div className="sm:col-span-2 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800 space-y-2">
                  <span className="text-zinc-400 text-[10px] font-medium uppercase tracking-wider block">
                    Database Connectivity Status
                  </span>

                  {detailTarget.isConnected && detailTarget.dbRecords && (
                    <div className="space-y-2">
                      <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1.5">
                        <span>✓</span> Connected to{" "}
                        {detailTarget.dbRecords.length} database reference(s):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {detailTarget.dbRecords.map((r, idx) => (
                          <div
                            key={idx}
                            className="bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs"
                          >
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 capitalize block">
                              Table: {r.table}
                            </span>
                            <span className="text-zinc-500 block text-[11px]">
                              Entity: {r.entityName || `ID #${r.entityId}`}
                            </span>
                            {r.fieldName && (
                              <span className="text-indigo-500 font-mono text-[10px] block">
                                Field: {r.fieldName}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detailTarget.isOrphaned && (
                    <p className="text-amber-600 dark:text-amber-400 font-medium text-xs">
                      ⚠️ This file exists in physical storage but is not
                      currently assigned to any category, product, or site
                      configuration.
                    </p>
                  )}

                  {detailTarget.isBroken && (
                    <p className="text-rose-600 dark:text-rose-400 font-medium text-xs">
                      ❌ This database link points to a non-existent file on
                      physical storage.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const t = detailTarget;
                    setDetailTarget(null);
                    handleOpenSingleOptimize(t);
                  }}
                  disabled={detailTarget.isBroken}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-40"
                >
                  Optimize Image
                </button>

                {permissions.delete && !detailTarget.isBroken && (
                  <button
                    onClick={() => {
                      const t = detailTarget;
                      setDetailTarget(null);
                      setDeleteTarget(t);
                    }}
                    className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 rounded-xl text-xs font-semibold"
                  >
                    Delete File
                  </button>
                )}
              </div>

              <button
                onClick={() => setDetailTarget(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-medium"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Confirm Delete File
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Are you sure you want to delete{" "}
              <strong className="text-zinc-900 dark:text-zinc-100">
                {deleteTarget.fileName}
              </strong>{" "}
              from physical storage?
              {deleteTarget.isConnected && (
                <span className="block text-amber-600 dark:text-amber-400 font-semibold mt-1">
                  ⚠️ Note: This image is connected to active DB entities.
                  Deleting it will create broken image links.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSingle(deleteTarget)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500"
              >
                {isDeleting ? "Deleting..." : "Delete from Storage"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optimize Modal Integration */}
      <ImageOptimizeModal
        isOpen={isOptimizeOpen}
        onClose={() => setIsOptimizeOpen(false)}
        items={optimizeItems}
        onSave={handleSaveOptimizedFiles}
        title="Optimize & Overwrite Media File"
      />
    </div>
  );
}
