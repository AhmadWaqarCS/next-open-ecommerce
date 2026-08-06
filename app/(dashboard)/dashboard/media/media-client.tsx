"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import type {
  MediaScanResult,
  MediaFileItem,
  BrokenLinkItem,
} from "@/lib/media-types";
import { formatBytes } from "@/lib/media-types";
import { CRUD } from "@/lib/types";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import Modal from "@/app/(dashboard)/_components/modal";
import {
  ImageOptimizeModal,
  OptimizationItem,
} from "@/app/(dashboard)/_components/image-optimize-modal";
import { urlToFile } from "@/lib/image-optimizer";
import {
  deleteMediaAction,
  bulkDeleteMediaAction,
  reconnectMediaAction,
  clearBrokenMediaAction,
  replaceOptimizedMediaAction,
} from "@/actions/media-actions";

interface CategoryOption {
  id: number;
  name: string;
  slug: string;
}

interface VariantOption {
  id: number;
  name: string;
  sku: string | null;
}

interface ProductOption {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  variants: VariantOption[];
}

interface MediaClientProps {
  scanData: MediaScanResult;
  categories: CategoryOption[];
  products: ProductOption[];
  permissions: CRUD;
}

export default function MediaClient({
  scanData,
  categories,
  products,
  permissions,
}: MediaClientProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Filters & Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "connected" | "orphan" | "broken"
  >("all");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "date_desc" | "date_asc" | "size_desc" | "size_asc" | "name_asc"
  >("date_desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Selection & Bulk Actions State
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    currentBatch: number;
    totalBatches: number;
    deletedCount: number;
    totalCount: number;
  } | null>(null);

  // Modal States
  const [selectedPreviewFile, setSelectedPreviewFile] =
    useState<MediaFileItem | null>(null);
  const [selectedDeleteFile, setSelectedDeleteFile] =
    useState<MediaFileItem | null>(null);

  // Reconnect Modal State
  const [selectedReconnectFile, setSelectedReconnectFile] =
    useState<MediaFileItem | null>(null);
  const [reconnectTargetType, setReconnectTargetType] = useState<
    | "category"
    | "product_feature"
    | "product_gallery"
    | "product_variant"
    | "site_logo_light"
    | "site_logo_dark"
    | "site_favicon"
  >("category");
  const [reconnectTargetId, setReconnectTargetId] = useState<number | "">("");
  const [reconnectAltText, setReconnectAltText] = useState("");

  // Clear Broken Link Modal State
  const [selectedClearBroken, setSelectedClearBroken] =
    useState<BrokenLinkItem | null>(null);

  // Optimization Modal State
  const [isOptimizeModalOpen, setIsOptimizeModalOpen] = useState(false);
  const [optimizeItems, setOptimizeItems] = useState<OptimizationItem[]>([]);
  const [isPreparingOptimize, setIsPreparingOptimize] = useState(false);

  const handleOptimizeSingleFile = async (fileItem: MediaFileItem) => {
    setIsPreparingOptimize(true);
    const fileObj = await urlToFile(fileItem.relativePath, fileItem.fileName);
    setIsPreparingOptimize(false);

    if (!fileObj) {
      toast("Failed to load image file for optimization", "error");
      return;
    }

    setOptimizeItems([
      {
        id: fileItem.relativePath,
        label: fileItem.fileName,
        originalFile: fileObj,
      },
    ]);
    setIsOptimizeModalOpen(true);
  };

  const handleOptimizeBatch = async (filesToOptimize: MediaFileItem[]) => {
    if (!filesToOptimize || filesToOptimize.length === 0) return;
    setIsPreparingOptimize(true);

    const items: OptimizationItem[] = [];
    for (const item of filesToOptimize) {
      const fileObj = await urlToFile(item.relativePath, item.fileName);
      if (fileObj) {
        items.push({
          id: item.relativePath,
          label: item.fileName,
          originalFile: fileObj,
        });
      }
    }

    setIsPreparingOptimize(false);

    if (items.length === 0) {
      toast("Failed to load image files for optimization", "error");
      return;
    }

    setOptimizeItems(items);
    setIsOptimizeModalOpen(true);
  };

  const handleSaveOptimizedFiles = (optimizedMap: Record<string, File>) => {
    startTransition(async () => {
      let successCount = 0;
      let failCount = 0;

      for (const [oldPath, newFile] of Object.entries(optimizedMap)) {
        const formData = new FormData();
        formData.append("oldRelativePath", oldPath);
        formData.append("file", newFile);

        const res = await replaceOptimizedMediaAction(formData);
        if (res.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      setIsOptimizeModalOpen(false);
      if (successCount > 0) {
        toast(
          `Successfully optimized and saved ${successCount} image file(s).`,
          "success",
        );
      }
      if (failCount > 0) {
        toast(`Failed to save ${failCount} image file(s).`, "error");
      }

      window.location.reload();
    });
  };

  // List of unique subfolders found in files
  const availableSubfolders = useMemo(() => {
    const folders = new Set<string>();
    scanData.files.forEach((f) => folders.add(f.subfolder));
    return Array.from(folders).sort();
  }, [scanData.files]);

  // Filtered and Sorted Files
  const filteredFiles = useMemo(() => {
    return scanData.files
      .filter((file) => {
        // Status Filter
        if (statusFilter === "connected" && file.isOrphan) return false;
        if (statusFilter === "orphan" && !file.isOrphan) return false;
        if (statusFilter === "broken") return false; // Broken links are rendered separately

        // Folder Filter
        if (folderFilter !== "all" && file.subfolder !== folderFilter)
          return false;

        // Search Filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchName = file.fileName.toLowerCase().includes(q);
          const matchPath = file.relativePath.toLowerCase().includes(q);
          const matchConnection = file.connections.some(
            (c) =>
              c.entityName.toLowerCase().includes(q) ||
              c.details.toLowerCase().includes(q),
          );
          if (!matchName && !matchPath && !matchConnection) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date_desc") {
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        }
        if (sortBy === "date_asc") {
          return (
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          );
        }
        if (sortBy === "size_desc") {
          return b.size - a.size;
        }
        if (sortBy === "size_asc") {
          return a.size - b.size;
        }
        if (sortBy === "name_asc") {
          return a.fileName.localeCompare(b.fileName);
        }
        return 0;
      });
  }, [scanData.files, statusFilter, folderFilter, searchTerm, sortBy]);

  // Selected Files Summary
  const selectedFilesList = useMemo(() => {
    return scanData.files.filter((f) => selectedPaths.has(f.relativePath));
  }, [scanData.files, selectedPaths]);

  const selectedTotalSizeFormatted = useMemo(() => {
    const bytes = selectedFilesList.reduce((acc, f) => acc + f.size, 0);
    return formatBytes(bytes);
  }, [selectedFilesList]);

  const hasConnectedInSelection = useMemo(() => {
    return selectedFilesList.some((f) => !f.isOrphan);
  }, [selectedFilesList]);

  // Checkbox Handlers
  const toggleSelectFile = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleToggleSelectAllFiltered = () => {
    const allFilteredPaths = filteredFiles.map((f) => f.relativePath);
    const isAllSelected = allFilteredPaths.every((p) => selectedPaths.has(p));

    if (isAllSelected) {
      // Unselect all filtered
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        allFilteredPaths.forEach((p) => next.delete(p));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        allFilteredPaths.forEach((p) => next.add(p));
        return next;
      });
    }
  };

  const handleSelectAllOrphans = () => {
    const orphanPaths = scanData.files
      .filter((f) => f.isOrphan)
      .map((f) => f.relativePath);
    setSelectedPaths(new Set(orphanPaths));
    setStatusFilter("orphan");
    toast(`Selected all ${orphanPaths.length} unused orphan files`, "info");
  };

  const handleClearSelection = () => {
    setSelectedPaths(new Set());
  };

  // Single File Deletion Handler
  const handleDeleteFile = () => {
    if (!selectedDeleteFile) return;
    startTransition(async () => {
      const res = await deleteMediaAction({
        relativePath: selectedDeleteFile.relativePath,
      });
      if (!res.success) {
        toast(res.message || "Failed to delete file", "error");
        return;
      }
      toast(res.message || "File deleted successfully", "success");

      // Clear selection if deleted
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        next.delete(selectedDeleteFile.relativePath);
        return next;
      });

      setSelectedDeleteFile(null);
      if (
        selectedPreviewFile?.relativePath === selectedDeleteFile.relativePath
      ) {
        setSelectedPreviewFile(null);
      }
    });
  };

  // Bulk Delete Batch Handler (Batched execution to prevent server IO crashes)
  const handleBulkDeleteSubmit = () => {
    const pathsArray = Array.from(selectedPaths);
    if (pathsArray.length === 0) return;

    const BATCH_SIZE = 10;
    const totalBatches = Math.ceil(pathsArray.length / BATCH_SIZE);

    startTransition(async () => {
      let totalDeleted = 0;
      let totalFailed = 0;

      for (let i = 0; i < totalBatches; i++) {
        const batchPaths = pathsArray.slice(
          i * BATCH_SIZE,
          (i + 1) * BATCH_SIZE,
        );
        setBulkProgress({
          currentBatch: i + 1,
          totalBatches,
          deletedCount: totalDeleted,
          totalCount: pathsArray.length,
        });

        const res = await bulkDeleteMediaAction({ relativePaths: batchPaths });
        if (res.success) {
          totalDeleted += batchPaths.length;
        } else {
          totalFailed += batchPaths.length;
        }
      }

      toast(
        `Bulk deletion complete: ${totalDeleted} files deleted (${totalFailed} failed)`,
        totalFailed > 0 ? "error" : "success",
      );

      setBulkProgress(null);
      setIsBulkDeleteModalOpen(false);
      setSelectedPaths(new Set());
    });
  };

  const handleCopyPath = (pathText: string) => {
    navigator.clipboard.writeText(pathText);
    toast("Path copied to clipboard!", "info");
  };

  const handleOpenReconnectModal = (file: MediaFileItem) => {
    setSelectedReconnectFile(file);
    setReconnectTargetType("category");
    setReconnectTargetId(categories[0]?.id || "");
    setReconnectAltText("");
  };

  const handleReconnectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReconnectFile) return;

    const requiresId = [
      "category",
      "product_feature",
      "product_gallery",
      "product_variant",
    ].includes(reconnectTargetType);

    if (
      requiresId &&
      (!reconnectTargetId || typeof reconnectTargetId !== "number")
    ) {
      toast("Please select a target entity", "error");
      return;
    }

    startTransition(async () => {
      const res = await reconnectMediaAction({
        relativePath: selectedReconnectFile.relativePath,
        targetType: reconnectTargetType,
        targetId: requiresId ? (reconnectTargetId as number) : undefined,
        altText: reconnectAltText.trim() || undefined,
      });

      if (!res.success) {
        toast(res.message || "Failed to update image connection", "error");
        return;
      }

      toast(
        res.message || "Image position reconnected successfully!",
        "success",
      );
      setSelectedReconnectFile(null);
    });
  };

  const handleClearBrokenLinkSubmit = () => {
    if (!selectedClearBroken) return;
    startTransition(async () => {
      const res = await clearBrokenMediaAction({
        targetType: selectedClearBroken.entityType,
        targetId: selectedClearBroken.entityId,
        galleryImageId: selectedClearBroken.galleryImageId,
      });

      if (!res.success) {
        toast(res.message || "Failed to remove broken reference", "error");
        return;
      }

      toast(res.message || "Broken database reference cleared", "success");
      setSelectedClearBroken(null);
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Media Storage
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Inspect physical uploads disk storage, track database image
                usage, clean orphan files, and resolve broken links.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          {permissions.update && filteredFiles.length > 0 && (
            <button
              onClick={() => handleOptimizeBatch(filteredFiles)}
              disabled={isPreparingOptimize}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                />
              </svg>
              <span>
                {isPreparingOptimize
                  ? "Loading Files..."
                  : `Optimize All (${filteredFiles.length})`}
              </span>
            </button>
          )}

          {permissions.delete && scanData.stats.orphanFilesCount > 0 && (
            <button
              onClick={handleSelectAllOrphans}
              className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/70 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Select All {scanData.stats.orphanFilesCount} Unused Files
            </button>
          )}

          <div className="text-right hidden sm:block">
            <p className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">
              Storage Target
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-900/50">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Local Disk (uploads/)
            </span>
          </div>
        </div>
      </div>

      {/* ── Summary Statistics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Disk Size */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Total Disk Size
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {scanData.stats.formattedTotalDiskSize}
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              Across {scanData.stats.totalFilesCount} total files
            </p>
          </div>
        </div>

        {/* Card 2: Total Files */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Total Files
            </span>
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {scanData.stats.totalFilesCount}
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              In uploads directory
            </p>
          </div>
        </div>

        {/* Card 3: Connected Images */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Connected Images
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {scanData.stats.connectedFilesCount}
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              {scanData.stats.totalFilesCount > 0
                ? `${Math.round((scanData.stats.connectedFilesCount / scanData.stats.totalFilesCount) * 100)}% in active DB use`
                : "0% in active use"}
            </p>
          </div>
        </div>

        {/* Card 4: Orphan Files */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Unused (Orphans)
            </span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {scanData.stats.orphanFilesCount}
            </div>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
              {scanData.stats.formattedWastedOrphanSize} wasted disk
            </p>
          </div>
        </div>

        {/* Card 5: Broken Links */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Broken DB Links
            </span>
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {scanData.stats.brokenLinksCount}
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              Missing physical files
            </p>
          </div>
        </div>
      </div>

      {/* ── Toolbar: Search & Filters ── */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/50 dark:border-zinc-800">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              All Files ({scanData.stats.totalFilesCount})
            </button>
            <button
              onClick={() => setStatusFilter("connected")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === "connected"
                  ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Connected ({scanData.stats.connectedFilesCount})
            </button>
            <button
              onClick={() => setStatusFilter("orphan")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === "orphan"
                  ? "bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Unused / Orphans ({scanData.stats.orphanFilesCount})
            </button>

            <button
              onClick={() => setStatusFilter("broken")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === "broken"
                  ? "bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Broken DB Links ({scanData.stats.brokenLinksCount})
            </button>
          </div>

          {/* Search Input & View Toggle */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <svg
                className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400"
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
              <input
                type="text"
                placeholder="Search file or connection..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/50 dark:border-zinc-800">
              <button
                onClick={() => setViewMode("grid")}
                title="Grid View"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="Table / List View"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filter Dropdowns & Select All Checkbox */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
          <div className="flex items-center gap-3">
            {permissions.delete &&
              statusFilter !== "broken" &&
              filteredFiles.length > 0 && (
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={
                      filteredFiles.length > 0 &&
                      filteredFiles.every((f) =>
                        selectedPaths.has(f.relativePath),
                      )
                    }
                    onChange={handleToggleSelectAllFiltered}
                    className="rounded-md border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                  />
                  Select All Filtered ({filteredFiles.length})
                </label>
              )}

            <div className="flex items-center gap-2">
              <span className="text-zinc-400 font-medium">Subfolder:</span>
              <select
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 focus:outline-none"
              >
                <option value="all">All Subfolders</option>
                {availableSubfolders.map((f) => (
                  <option key={f} value={f}>
                    {f === "root" ? "/ (Root)" : f}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-zinc-400 font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 focus:outline-none"
              >
                <option value="date_desc">Latest Modified</option>
                <option value="date_asc">Oldest Modified</option>
                <option value="size_desc">File Size (Largest first)</option>
                <option value="size_asc">File Size (Smallest first)</option>
                <option value="name_asc">Name (A-Z)</option>
              </select>
            </div>
          </div>

          <div className="text-zinc-400">
            Showing{" "}
            <strong className="text-zinc-700 dark:text-zinc-200">
              {filteredFiles.length}
            </strong>{" "}
            of {scanData.files.length} files
          </div>
        </div>
      </div>

      {/* ── Broken Links View (when Broken status is selected) ── */}
      {statusFilter === "broken" && (
        <div className="space-y-4">
          {scanData.brokenLinks.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                No Broken Database Links Found
              </p>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                All internal local storage image references stored in your
                database point to valid physical files in your uploads
                directory. External image URLs (if any) are excluded from
                storage checks.
              </p>
            </div>
          ) : (
            <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/50 p-6 space-y-4">
              <div className="flex items-center gap-3 text-rose-700 dark:text-rose-300">
                <svg
                  className="h-5 w-5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <h3 className="font-bold text-sm">
                    Broken Image References ({scanData.brokenLinks.length})
                  </h3>
                  <p className="text-xs text-rose-600/80 dark:text-rose-400/80">
                    These database records reference a local storage image path
                    (/uploads/...) that no longer exists on physical disk.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-rose-200/60 dark:divide-rose-900/40 bg-white dark:bg-zinc-900 rounded-xl border border-rose-200/60 dark:border-rose-900/40 overflow-hidden">
                {scanData.brokenLinks.map((link, idx) => (
                  <div
                    key={idx}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {link.entityName}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono text-[10px]">
                          {link.details}
                        </span>
                      </div>
                      <p className="font-mono text-zinc-500 dark:text-zinc-400 text-[11px] truncate">
                        Missing Target Path: {link.url}
                      </p>
                    </div>

                    {permissions.update && (
                      <button
                        onClick={() => setSelectedClearBroken(link)}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors self-start sm:self-auto cursor-pointer"
                      >
                        Clear DB Reference
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Main Media Files View (Grid vs List) ── */}
      {statusFilter !== "broken" && (
        <>
          {filteredFiles.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                No media files match your filter criteria
              </p>
              <p className="text-xs text-zinc-400">
                Try searching for a different name or clearing selected filter
                tabs.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            /* ── GRID VIEW ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFiles.map((file) => {
                const isSelected = selectedPaths.has(file.relativePath);
                return (
                  <div
                    key={file.relativePath}
                    className={`group relative bg-white dark:bg-zinc-900 rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col ${
                      isSelected
                        ? "ring-2 ring-indigo-500 border-indigo-500 shadow-md"
                        : file.isOrphan
                          ? "border-amber-200 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-700"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600"
                    }`}
                  >
                    {/* Checkbox Overlay (Top Right) */}
                    {permissions.delete && (
                      <div className="absolute top-2.5 right-2.5 z-20">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectFile(file.relativePath)}
                          className="h-5 w-5 rounded-md border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 shadow-md cursor-pointer"
                        />
                      </div>
                    )}

                    {/* Aspect Square Image Thumbnail Preview */}
                    <div
                      onClick={() => setSelectedPreviewFile(file)}
                      className="relative aspect-square bg-zinc-100 dark:bg-zinc-950/80 overflow-hidden flex items-center justify-center cursor-pointer"
                    >
                      <Image
                        src={file.relativePath}
                        alt={file.fileName}
                        fill
                        // unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Status Badge Tag */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        {file.isOrphan ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-white backdrop-blur-xs shadow-xs">
                            Unused / Orphan
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600/90 text-white backdrop-blur-xs shadow-xs">
                            Connected ({file.connections.length})
                          </span>
                        )}
                      </div>

                      {/* Size Pill */}
                      <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-900/80 text-zinc-100 backdrop-blur-xs">
                        {file.formattedSize}
                      </div>

                      {/* Hover Action Overlay Buttons */}
                      <div className="absolute inset-0 bg-zinc-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-xs flex items-center justify-center gap-2 p-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPreviewFile(file);
                          }}
                          className="p-2.5 rounded-xl bg-white/90 hover:bg-white text-zinc-800 font-medium text-xs transition-all shadow-md cursor-pointer"
                          title="View Details & Usage"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyPath(file.relativePath);
                          }}
                          className="p-2.5 rounded-xl bg-white/90 hover:bg-white text-zinc-800 font-medium text-xs transition-all shadow-md cursor-pointer"
                          title="Copy Public URL"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </button>

                        {permissions.update && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenReconnectModal(file);
                            }}
                            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-all shadow-md cursor-pointer"
                            title="Reconnect or Assign Position"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                              />
                            </svg>
                          </button>
                        )}

                        {permissions.delete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDeleteFile(file);
                            }}
                            className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition-all shadow-md cursor-pointer"
                            title="Delete File"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card Bottom Meta Info */}
                    <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                      <div>
                        <p
                          className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate"
                          title={file.fileName}
                        >
                          {file.fileName}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate font-mono mt-0.5">
                          {file.relativePath}
                        </p>
                      </div>

                      {/* Connected entity pill list */}
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap gap-1">
                        {file.isOrphan ? (
                          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            No database references
                          </span>
                        ) : (
                          file.connections.map((c, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium truncate max-w-full"
                              title={`${c.entityName} (${c.details})`}
                            >
                              {c.entityName}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── LIST / TABLE VIEW ── */
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold text-[10px]">
                    <tr>
                      {permissions.delete && (
                        <th className="py-3 px-4 w-10">
                          <input
                            type="checkbox"
                            checked={
                              filteredFiles.length > 0 &&
                              filteredFiles.every((f) =>
                                selectedPaths.has(f.relativePath),
                              )
                            }
                            onChange={handleToggleSelectAllFiltered}
                            className="rounded-md border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="py-3 px-4">Preview</th>
                      <th className="py-3 px-4">File Name & Path</th>
                      <th className="py-3 px-4">Folder</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Status & Connections</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {filteredFiles.map((file) => {
                      const isSelected = selectedPaths.has(file.relativePath);
                      return (
                        <tr
                          key={file.relativePath}
                          className={`transition-colors ${
                            isSelected
                              ? "bg-indigo-50/60 dark:bg-indigo-950/30"
                              : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40"
                          }`}
                        >
                          {/* Checkbox */}
                          {permissions.delete && (
                            <td className="py-2.5 px-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() =>
                                  toggleSelectFile(file.relativePath)
                                }
                                className="rounded-md border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                              />
                            </td>
                          )}

                          {/* Thumbnail */}
                          <td className="py-2.5 px-4 w-16">
                            <div
                              onClick={() => setSelectedPreviewFile(file)}
                              className="relative h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700 cursor-pointer flex items-center justify-center"
                            >
                              <Image
                                src={file.relativePath}
                                alt={file.fileName}
                                fill
                                // unoptimized
                                className="object-cover"
                              />
                            </div>
                          </td>

                          {/* File Name & Path */}
                          <td className="py-2.5 px-4 max-w-xs">
                            <p
                              className="font-semibold text-zinc-900 dark:text-zinc-100 truncate"
                              title={file.fileName}
                            >
                              {file.fileName}
                            </p>
                            <p className="font-mono text-[10px] text-zinc-400 truncate">
                              {file.relativePath}
                            </p>
                          </td>

                          {/* Subfolder */}
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono text-[10px]">
                              {file.subfolder}
                            </span>
                          </td>

                          {/* Size */}
                          <td className="py-2.5 px-4 font-mono font-medium text-zinc-700 dark:text-zinc-300">
                            {file.formattedSize}
                          </td>

                          {/* Status & Connections */}
                          <td className="py-2.5 px-4">
                            {file.isOrphan ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                Unused / Orphan
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {file.connections.map((c, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium"
                                  >
                                    {c.entityName} ({c.details})
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedPreviewFile(file)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                                title="Details"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                              </button>

                              <button
                                onClick={() =>
                                  handleCopyPath(file.relativePath)
                                }
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                                title="Copy Path"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                              </button>

                              {permissions.update && (
                                <button
                                  onClick={() => handleOpenReconnectModal(file)}
                                  className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                                  title="Reconnect"
                                >
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                    />
                                  </svg>
                                </button>
                              )}

                              {permissions.delete && (
                                <button
                                  onClick={() => setSelectedDeleteFile(file)}
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                  title="Delete"
                                >
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── STICKY BULK ACTIONS BAR (When files are selected) ── */}
      {selectedPaths.size > 0 && permissions.delete && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-zinc-900/95 dark:bg-zinc-800/95 text-white px-6 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md border border-zinc-700/60 flex items-center gap-6 animate-slide-up">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-xs">
              {selectedPaths.size}
            </span>
            <div className="text-xs">
              <p className="font-bold leading-none text-zinc-100">
                {selectedPaths.size} file(s) selected
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Total size: {selectedTotalSizeFormatted}
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-zinc-700/60" />

          <div className="flex items-center gap-3">
            {permissions.update && (
              <button
                onClick={() => handleOptimizeBatch(selectedFilesList)}
                disabled={isPreparingOptimize}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
                <span>
                  {isPreparingOptimize
                    ? "Loading..."
                    : `Optimize Selected (${selectedPaths.size})`}
                </span>
              </button>
            )}

            <button
              onClick={handleClearSelection}
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Clear
            </button>

            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Bulk Delete ({selectedPaths.size})
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL 1: BULK DELETE CONFIRMATION & BATCH PROGRESS ── */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => {
          if (!isPending) setIsBulkDeleteModalOpen(false);
        }}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-rose-600">
            <div className="p-2.5 rounded-full bg-rose-100 dark:bg-rose-950/60">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Bulk Delete Media Files
              </h3>
              <p className="text-xs text-zinc-400">
                Safe batch execution to prevent server IO crashes
              </p>
            </div>
          </div>

          <p className="text-xs text-zinc-600 dark:text-zinc-300">
            You are about to permanently delete{" "}
            <strong>{selectedPaths.size} file(s)</strong> (
            {selectedTotalSizeFormatted}) from disk storage.
          </p>

          {hasConnectedInSelection && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs space-y-1">
              <p className="font-bold">
                Caution: Connected images included in selection!
              </p>
              <p className="text-[11px]">
                One or more selected files are connected to active database
                entities (categories, products, variants, or logos). Deleting
                them will result in broken image references.
              </p>
            </div>
          )}

          {/* Batch Progress Bar (While executing) */}
          {bulkProgress && (
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <span>Deleting in batches...</span>
                <span>
                  Batch {bulkProgress.currentBatch} of{" "}
                  {bulkProgress.totalBatches} ({bulkProgress.deletedCount}/
                  {bulkProgress.totalCount})
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-rose-600 transition-all duration-300 rounded-full"
                  style={{
                    width: `${Math.round(
                      (bulkProgress.deletedCount / bulkProgress.totalCount) *
                        100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={handleBulkDeleteSubmit}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isPending ? (
                <>
                  <svg
                    className="animate-spin h-3.5 w-3.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Deleting Batches...
                </>
              ) : (
                `Confirm Delete (${selectedPaths.size} Files)`
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 2: PREVIEW & DETAILS MODAL ── */}
      <Modal
        isOpen={Boolean(selectedPreviewFile)}
        onClose={() => setSelectedPreviewFile(null)}
        className="max-w-4xl"
      >
        {selectedPreviewFile && (
          <div className="space-y-5">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Media Details
            </h3>

            {/* Preview Image Box */}
            <div className="relative aspect-video rounded-xl bg-zinc-100 dark:bg-zinc-950 overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
              <Image
                src={selectedPreviewFile.relativePath}
                alt={selectedPreviewFile.fileName}
                fill
                // unoptimized
                className="object-contain"
              />
            </div>

            {/* File Properties */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
                <p className="text-zinc-400 font-medium">File Name</p>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate mt-0.5">
                  {selectedPreviewFile.fileName}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
                <p className="text-zinc-400 font-medium">Disk Size</p>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                  {selectedPreviewFile.formattedSize} (
                  {selectedPreviewFile.size.toLocaleString()} B)
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
                <p className="text-zinc-400 font-medium">File Type</p>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 font-mono">
                  {selectedPreviewFile.mimeType}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
                <p className="text-zinc-400 font-medium">Subfolder</p>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                  {selectedPreviewFile.subfolder}
                </p>
              </div>
            </div>

            {/* Path Box */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Relative Public URL
              </span>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400 truncate">
                  {selectedPreviewFile.relativePath}
                </code>
                <button
                  onClick={() =>
                    handleCopyPath(selectedPreviewFile.relativePath)
                  }
                  className="px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* DB Usage / Connections list */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Database Connections ({selectedPreviewFile.connections.length})
              </h4>

              {selectedPreviewFile.isOrphan ? (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs">
                  This image is <strong>Unused / Orphan</strong>. It is not
                  linked to any active category, product, variant, or site logo.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {selectedPreviewFile.connections.map((conn, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-zinc-800 dark:text-zinc-200">
                          {conn.entityName}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {conn.details}
                        </p>
                      </div>

                      {conn.entityType === "category" && conn.slug && (
                        <Link
                          href={`/dashboard/categories`}
                          className="text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          View Category &rarr;
                        </Link>
                      )}
                      {(conn.entityType === "product_feature" ||
                        conn.entityType === "product_gallery" ||
                        conn.entityType === "product_variant") &&
                        conn.slug && (
                          <Link
                            href={`/dashboard/products/${conn.slug}/edit`}
                            className="text-xs font-semibold text-indigo-600 hover:underline"
                          >
                            Edit Product &rarr;
                          </Link>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex-wrap">
              {permissions.update && (
                <button
                  onClick={() => {
                    const fileItem = selectedPreviewFile;
                    setSelectedPreviewFile(null);
                    handleOptimizeSingleFile(fileItem);
                  }}
                  disabled={isPreparingOptimize}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
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
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                    />
                  </svg>
                  <span>
                    {isPreparingOptimize ? "Loading..." : "Optimize Image"}
                  </span>
                </button>
              )}

              {permissions.update && (
                <button
                  onClick={() => {
                    const file = selectedPreviewFile;
                    setSelectedPreviewFile(null);
                    handleOpenReconnectModal(file);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Reconnect / Assign Position
                </button>
              )}

              {permissions.delete && (
                <button
                  onClick={() => {
                    const file = selectedPreviewFile;
                    setSelectedPreviewFile(null);
                    setSelectedDeleteFile(file);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Delete File
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL 3: SINGLE DELETE CONFIRMATION MODAL ── */}
      <Modal
        isOpen={Boolean(selectedDeleteFile)}
        onClose={() => setSelectedDeleteFile(null)}
      >
        {selectedDeleteFile && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-full bg-rose-100 dark:bg-rose-950/60">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Delete Media File
              </h3>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Are you sure you want to permanently delete{" "}
              <strong>{selectedDeleteFile.fileName}</strong> (
              {selectedDeleteFile.formattedSize}) from physical disk storage?
            </p>

            {!selectedDeleteFile.isOrphan && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                <p className="font-bold">
                  Warning: File is currently connected!
                </p>
                <p className="text-[11px]">
                  This image is actively connected to{" "}
                  {selectedDeleteFile.connections.length} database entity(ies):{" "}
                  {selectedDeleteFile.connections
                    .map((c) => c.entityName)
                    .join(", ")}
                  . Deleting this file will result in missing image links.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedDeleteFile(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={handleDeleteFile}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL 4: RECONNECT / RE-ASSIGN MODAL ── */}
      <Modal
        isOpen={Boolean(selectedReconnectFile)}
        onClose={() => setSelectedReconnectFile(null)}
      >
        {selectedReconnectFile && (
          <form onSubmit={handleReconnectSubmit} className="space-y-4">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="p-2.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Connect / Re-assign Image
                </h3>
                <p className="text-xs text-zinc-400">
                  {selectedReconnectFile.fileName}
                </p>
              </div>
            </div>

            {/* Target Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Target Entity Position
              </label>
              <select
                value={reconnectTargetType}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setReconnectTargetType(val);
                  if (val === "category")
                    setReconnectTargetId(categories[0]?.id || "");
                  else if (
                    val === "product_feature" ||
                    val === "product_gallery"
                  )
                    setReconnectTargetId(products[0]?.id || "");
                  else if (val === "product_variant")
                    setReconnectTargetId(products[0]?.variants[0]?.id || "");
                  else setReconnectTargetId("");
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="category">Category Banner Image</option>
                <option value="product_feature">Product Feature Image</option>
                <option value="product_gallery">Add to Product Gallery</option>
                <option value="product_variant">Product Variant Image</option>
                <option value="site_logo_light">Site Config Light Logo</option>
                <option value="site_logo_dark">Site Config Dark Logo</option>
                <option value="site_favicon">Site Config Favicon</option>
              </select>
            </div>

            {/* Target Selection Dropdown */}
            {reconnectTargetType === "category" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Select Category
                </label>
                <select
                  value={reconnectTargetId}
                  onChange={(e) => setReconnectTargetId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(reconnectTargetType === "product_feature" ||
              reconnectTargetType === "product_gallery") && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Select Product
                </label>
                <select
                  value={reconnectTargetId}
                  onChange={(e) => setReconnectTargetId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(SKU: ${p.sku})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {reconnectTargetType === "product_variant" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Select Product Variant
                </label>
                <select
                  value={reconnectTargetId}
                  onChange={(e) => setReconnectTargetId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {products.flatMap((p) =>
                    p.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {p.name} — {v.name} {v.sku ? `(${v.sku})` : ""}
                      </option>
                    )),
                  )}
                </select>
              </div>
            )}

            {/* Alt Text Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Alt Text (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Red sneaker side view"
                value={reconnectAltText}
                onChange={(e) => setReconnectAltText(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedReconnectFile(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Connecting..." : "Assign / Reconnect Position"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── MODAL 5: CLEAR BROKEN REFERENCE MODAL ── */}
      <Modal
        isOpen={Boolean(selectedClearBroken)}
        onClose={() => setSelectedClearBroken(null)}
      >
        {selectedClearBroken && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-full bg-rose-100 dark:bg-rose-950/60">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Clear Broken Link
              </h3>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Are you sure you want to remove the broken image link{" "}
              <strong>{selectedClearBroken.url}</strong> from{" "}
              <strong>{selectedClearBroken.entityName}</strong> (
              {selectedClearBroken.details})?
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedClearBroken(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={handleClearBrokenLinkSubmit}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Clearing..." : "Clear Reference"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL 6: IMAGE OPTIMIZATION MODAL ── */}
      <ImageOptimizeModal
        isOpen={isOptimizeModalOpen}
        onClose={() => setIsOptimizeModalOpen(false)}
        items={optimizeItems}
        onSave={handleSaveOptimizedFiles}
        title="Optimize Media Storage Images"
      />
    </div>
  );
}
