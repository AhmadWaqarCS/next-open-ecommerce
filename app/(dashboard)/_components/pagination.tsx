"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useTransition } from "react";

interface PaginationProps {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  itemName: string;
  pageSizeOptions?: number[];
}

export default function Pagination({
  totalItems,
  currentPage,
  pageSize,
  itemName,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Sync saved per-module pageSize from localStorage if not explicitly present in URL
  useEffect(() => {
    if (!searchParams?.has("size")) {
      const savedSize = localStorage.getItem(`pagination_pageSize_${itemName}`);
      if (savedSize && !isNaN(Number(savedSize))) {
        const parsedSize = Number(savedSize);
        if (parsedSize !== pageSize && pageSizeOptions.includes(parsedSize)) {
          const params = new URLSearchParams(searchParams?.toString() ?? "");
          params.set("page", "1");
          params.set("size", parsedSize.toString());
          startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`);
          });
        }
      }
    }
  }, [itemName, searchParams, pageSize, pageSizeOptions, pathname, router]);

  const createQueryString = (newPage: number, newSize?: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", newPage.toString());
    params.set("size", (newSize ?? pageSize).toString());
    return params.toString();
  };

  const handlePageSizeChange = (newSize: number) => {
    try {
      localStorage.setItem(`pagination_pageSize_${itemName}`, newSize.toString());
    } catch {
      // Ignore storage errors in restricted environments
    }
    const queryString = createQueryString(1, newSize);
    startTransition(() => {
      router.push(`${pathname}?${queryString}`);
    });
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    const queryString = createQueryString(page);
    startTransition(() => {
      router.push(`${pathname}?${queryString}`);
    });
  };

  // Calculate 3 inner page numbers window
  let pages: number[] = [];
  let showPreEllipsis = false;
  let showPostEllipsis = false;

  if (totalPages <= 3) {
    pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    let startPage = Math.max(1, currentPage - 1);
    let endPage = startPage + 2;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = totalPages - 2;
    }

    pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    showPreEllipsis = startPage > 1;
    showPostEllipsis = endPage < totalPages;
  }

  return (
    <div
      className={`mt-auto sticky bottom-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md py-3.5 px-6 md:px-8 -mx-6 md:-mx-8 -mb-6 md:-mb-8 mt-6 shadow-md transition-opacity ${
        isPending ? "opacity-60 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Info text & Items per page dropdown */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-zinc-500 dark:text-zinc-400">
        <p>
          Showing{" "}
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            {startItem}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            {endItem}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            {totalItems}
          </span>{" "}
          {itemName}
        </p>

        <div className="flex items-center gap-1.5 pl-3 border-l border-zinc-200 dark:border-zinc-800">
          <label htmlFor={`page-size-${itemName}`} className="sr-only">
            Items per page
          </label>
          <select
            id={`page-size-${itemName}`}
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pagination Buttons */}
      <div className="flex items-center gap-1">
        {/* Previous Page Button */}
        <button
          type="button"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Pre Ellipsis */}
        {showPreEllipsis && (
          <span className="px-2 py-1 text-sm text-zinc-400 dark:text-zinc-600 font-medium select-none">
            ...
          </span>
        )}

        {/* 3 Inner Page Buttons */}
        {pages.map((pageNum) => {
          const isCurrent = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => handlePageChange(pageNum)}
              className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                isCurrent
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Post Ellipsis */}
        {showPostEllipsis && (
          <span className="px-2 py-1 text-sm text-zinc-400 dark:text-zinc-600 font-medium select-none">
            ...
          </span>
        )}

        {/* Next Page Button */}
        <button
          type="button"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
