import type { LucideIcon } from "lucide-react";
import { ArrowLeftRight, Bot, LayoutDashboard, Lightbulb, ListTree, SearchCheck } from "lucide-react";

export const appRoutes = {
  overview: "/",
  paymentHealth: "/payment-health",
  retryAnalysis: "/retry-analysis",
  insights: "/insights",
  trace: "/trace",
  advisor: "/advisor",
  design: "/design",
} as const;

/** مسیر جزئیات یک بینش؛ `insightId` را با encodeURIComponent مقداردهی کنید. */
export function getInsightPath(insightId: string): string {
  return `/insights/${encodeURIComponent(insightId)}`;
}

/** مسیر ردیابی محاسبه (trace) یک بینش. */
export function getInsightTracePath(insightId: string): string {
  return `${getInsightPath(insightId)}/trace`;
}

export type AppRouteKey = keyof typeof appRoutes;

type NavigationItem = {
  key: AppRouteKey;
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

export const navigationSections: NavigationSection[] = [
  {
    title: "تحلیل",
    items: [
      {
        key: "overview",
        label: "نمای کلی",
        path: appRoutes.overview,
        icon: LayoutDashboard,
        description: "وضعیت کلی پرداخت و شاخص‌های کلیدی",
      },
      {
        key: "paymentHealth",
        label: "سلامت پرداخت",
        path: appRoutes.paymentHealth,
        icon: ArrowLeftRight,
        description: "نرخ موفقیت، مقایسه PSP و قیف پرداخت",
      },
      {
        key: "retryAnalysis",
        label: "تحلیل تلاش مجدد",
        path: appRoutes.retryAnalysis,
        icon: SearchCheck,
        description: "بازیابی سشن‌های ناموفق پس از تلاش مجدد",
      },
      {
        key: "insights",
        label: "بینش‌ها",
        path: appRoutes.insights,
        icon: Lightbulb,
        description: "تغییرها، اثر مالی و اقدام‌های پیشنهادی",
      },
      {
        key: "advisor",
        label: "مشاور پرداخت",
        path: appRoutes.advisor,
        icon: Bot,
        description: "تحلیل چندبعدی و روایت LLM",
      },
    ],
  },
  {
    title: "اعتبارسنجی",
    items: [
      {
        key: "trace",
        label: "ردیابی محاسبات",
        path: appRoutes.trace,
        icon: ListTree,
        description: "تعریف معیار، فیلترها و شواهد هر عدد",
      },
    ],
  },
];

export function findNavigationItem(pathname: string): NavigationItem | undefined {
  // مسیرهای فرزند (مثل جزئیات بینش) به آیتم والد نگاشت می‌شوند.
  if (pathname.startsWith("/insights/")) {
    return navigationSections.flatMap((section) => section.items).find((item) => item.key === "insights");
  }
  return navigationSections.flatMap((section) => section.items).find((item) => item.path === pathname);
}