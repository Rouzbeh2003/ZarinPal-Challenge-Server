import type { InsightSeverity } from "@/api/types";

/** متادیتای نمایشی severity (برچسب فارسی + کلاس‌های رنگی مجزا). */
export const SEVERITY_META: Record<InsightSeverity, { label: string; className: string }> = {
  low: { label: "کم", className: "bg-slate-500/15 text-slate-300 border-slate-500/40" },
  medium: { label: "متوسط", className: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
  high: { label: "زیاد", className: "bg-orange-500/15 text-orange-300 border-orange-500/40" },
  critical: { label: "بحرانی", className: "bg-red-500/15 text-red-300 border-red-500/40" },
};

export const SEVERITY_ORDER: InsightSeverity[] = ["critical", "high", "medium", "low"];

export const SEVERITY_FILTER_OPTIONS: Array<{ value: InsightSeverity | "all"; label: string }> = [
  { value: "all", label: "همه" },
  { value: "critical", label: "بحرانی" },
  { value: "high", label: "زیاد" },
  { value: "medium", label: "متوسط" },
  { value: "low", label: "کم" },
];