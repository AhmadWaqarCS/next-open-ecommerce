"use client";

import { useState } from "react";

interface TimelineItem {
  dateKey: string;
  label: string;
  revenue: number;
  orders: number;
}

interface OrderAnalyticsChartProps {
  timeline: TimelineItem[];
  currencySymbol: string;
}

export default function OrderAnalyticsChart({
  timeline,
  currencySymbol,
}: OrderAnalyticsChartProps) {
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!timeline || timeline.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-400 text-sm">
        No analytics data available for this range.
      </div>
    );
  }

  const values = timeline.map((t) => (metric === "revenue" ? t.revenue : t.orders));
  const maxValue = Math.max(...values, 1);
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 25;
  const width = 800; // viewBox width

  // Compute SVG Points
  const usableWidth = width - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const points = timeline.map((item, index) => {
    const val = metric === "revenue" ? item.revenue : item.orders;
    const x =
      timeline.length === 1
        ? width / 2
        : paddingX + (index / (timeline.length - 1)) * usableWidth;
    const y = chartHeight - paddingY - (val / maxValue) * usableHeight;
    return { x, y, val, item, index };
  });

  // Build SVG path string for area and line
  let pathD = "";
  let areaD = "";

  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    points.forEach((p, i) => {
      if (i === 0) return;
      // Smooth curve using cubic bezier control points
      const prev = points[i - 1];
      const cx1 = prev.x + (p.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (p.x - prev.x) / 2;
      const cy2 = p.y;
      pathD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`;
    });

    areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;
  }

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="space-y-4">
      {/* Metric Toggle & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-zinc-400">
            Performance Overview
          </p>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {metric === "revenue" ? "Revenue Over Time" : "Order Volume Over Time"}
          </h3>
        </div>

        <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1 border border-zinc-200 dark:border-zinc-700/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetric("revenue")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              metric === "revenue"
                ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Revenue ({currencySymbol})
          </button>
          <button
            type="button"
            onClick={() => setMetric("orders")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              metric === "orders"
                ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Orders Count
          </button>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${chartHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - paddingY - ratio * usableHeight;
            return (
              <line
                key={ratio}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="currentColor"
                className="text-zinc-200 dark:text-zinc-800/60"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Line path */}
          <path
            d={pathD}
            fill="none"
            stroke="#6366f1"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points and Hover Handlers */}
          {points.map((p) => {
            const isHovered = hoverIndex === p.index;
            return (
              <g key={p.index}>
                {/* Invisible larger hover zone */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="14"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(p.index)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
                {/* Visible Data Circle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? "6" : "4"}
                  className="transition-all duration-150 cursor-pointer"
                  fill={isHovered ? "#4f46e5" : "#6366f1"}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? "3" : "2"}
                  onMouseEnter={() => setHoverIndex(p.index)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {activePoint && (
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-lg px-3 py-2 shadow-xl z-20 transition-all border border-zinc-700/50 dark:border-zinc-200"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              top: `${(activePoint.y / chartHeight) * 100}%`,
            }}
          >
            <div className="font-semibold text-[11px] text-zinc-400 dark:text-zinc-500 mb-0.5">
              {activePoint.item.label}
            </div>
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[10px] uppercase text-zinc-400 dark:text-zinc-500 block">Revenue</span>
                <span className="font-bold">
                  {currencySymbol}
                  {activePoint.item.revenue.toLocaleString()}
                </span>
              </div>
              <div className="border-l border-zinc-700 dark:border-zinc-300 pl-2">
                <span className="text-[10px] uppercase text-zinc-400 dark:text-zinc-500 block">Orders</span>
                <span className="font-bold">{activePoint.item.orders}</span>
              </div>
            </div>
          </div>
        )}

        {/* X-Axis Labels */}
        <div className="flex justify-between items-center pt-2 px-6 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 select-none">
          {timeline.length <= 12
            ? timeline.map((t, idx) => <span key={idx}>{t.label}</span>)
            : timeline
                .filter((_, idx) => idx % Math.ceil(timeline.length / 8) === 0)
                .map((t, idx) => <span key={idx}>{t.label}</span>)}
        </div>
      </div>
    </div>
  );
}
