import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Insight, Overview, PaymentHealth } from "@/api/types";
import { getOverview, getPaymentHealth, getInsights } from "@/api/adapter";
import { getInsightPath } from "@/lib/navigation";
import { resolveDateRange, useGlobalFilters } from "@/lib/global-filters";
import { KpiCard, KpiCardSkeleton } from "@/components/dashboard/kpi-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { HealthSummary } from "@/components/dashboard/health-summary";
import { RecentInsights } from "@/components/dashboard/recent-insights";
import { DataState } from "@/components/ui/data-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; overview: Overview; health: PaymentHealth; insights: Insight[] };

export function OverviewPage() {
  const { merchantKey, dateRangePreset } = useGlobalFilters();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  const loadOverview = useCallback(async () => {
    setLoadState({ status: "loading" });
    try {
      const dateRange = resolveDateRange(dateRangePreset);
      const params = { merchantKey, ...dateRange };
      const [overview, health, insights] = await Promise.all([
        getOverview(params),
        getPaymentHealth(params),
        getInsights(params),
      ]);
      setLoadState({ status: "ready", overview, health, insights });
    } catch (error) {
      setLoadState({ status: "error", message: error instanceof Error ? error.message : "خطای ناشناخته" });
    }
  }, [merchantKey, dateRangePreset]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const navigate = useNavigate();
  const handleOpenInsight = useCallback(
    (insightId: string) => {
      navigate(getInsightPath(insightId));
    },
    [navigate],
  );

  if (loadState.status === "loading") {
    return <OverviewLoading />;
  }

  if (loadState.status === "error") {
    return (
      <DataState
        kind="error"
        title="دریافت داده ناموفق بود"
        description={loadState.message}
        actionLabel="تلاش دوباره"
        onAction={() => void loadOverview()}
      />
    );
  }

  const { overview, health, insights } = loadState;

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="شاخص‌های کلیدی" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overview.kpis.map((kpi) => (
          <KpiCard key={kpi.name} title={KPI_TITLES[kpi.name] ?? kpi.name} metric={kpi} formatValue={formatValue} />
        ))}
      </section>

      <section aria-label="نمودار روند و سلامت" className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">روند نرخ موفقیت</CardTitle>
            <CardDescription>درصد سشن‌های موفق در بازه انتخابی (نمایشی)</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={overview.trend.map((t) => ({
                key: t.date,
                label: formatDayLabel(t.date),
                value: t.successRate,
                display: `نرخ موفقیت: ${formatPercent(t.successRate)}`,
              }))}
              ariaLabel="روند نرخ موفقیت روزانه"
              colorLabel="نرخ موفقیت"
            />
          </CardContent>
        </Card>
        <HealthSummary health={health} formatPercent={formatPercent} formatAmount={formatAmount} />
      </section>

      <section aria-label="بینش‌های اخیر">
        <RecentInsights insights={insights} onOpenInsight={handleOpenInsight} />
      </section>
    </div>
  );
}

function OverviewLoading() {
  return (
    <div className="flex flex-col gap-6" aria-label="در حال بارگذاری نمای کلی">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="h-5 w-32 rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-48 rounded bg-muted/40" />
        </CardContent>
      </Card>
    </div>
  );
}

// --- فرمت‌ها (اعداد فارسی با جداکننده هزارگان) ---

function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`;
}

function formatAmount(value: number): string {
  return value.toLocaleString("fa-IR");
}

function formatValue(value: number, metric: Overview["kpis"][number]): string {
  if (metric.unit === "percent") return formatPercent(value);
  return formatAmount(value);
}

function formatDayLabel(isoDate: string): string {
  const day = new Date(isoDate).getDate();
  return day.toLocaleString("fa-IR");
}

const KPI_TITLES: Record<string, string> = {
  successful_amount: "فروش موفق",
  success_rate: "نرخ موفقیت",
  retry_rate: "نرخ تلاش مجدد",
  at_risk_amount: "مبلغ در معرض ازدست‌رفتن",
};