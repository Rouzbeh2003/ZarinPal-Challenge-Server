import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CircleDollarSign } from "lucide-react";
import type { Insight, InsightSeverity } from "@/api/types";
import { getInsights } from "@/api/adapter";
import { getInsightPath } from "@/lib/navigation";
import { SEVERITY_FILTER_OPTIONS, SEVERITY_META, SEVERITY_ORDER } from "@/lib/severity";
import { useGlobalFilters } from "@/lib/global-filters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataState } from "@/components/ui/data-state";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; insights: Insight[] };

type SeverityFilter = InsightSeverity | "all";

export function InsightsPage() {
  const { merchantKey, dateRangePreset } = useGlobalFilters();
  const navigate = useNavigate();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");

  const loadInsights = useCallback(async () => {
    setLoadState({ status: "loading" });
    try {
      const insights = await getInsights({ merchantKey });
      setLoadState({ status: "ready", insights });
    } catch (error) {
      setLoadState({ status: "error", message: error instanceof Error ? error.message : "خطای ناشناخته" });
    }
  }, [merchantKey, dateRangePreset]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  const filteredInsights = useMemo(() => {
    if (loadState.status !== "ready") return [];
    const list =
      severityFilter === "all"
        ? loadState.insights
        : loadState.insights.filter((insight) => insight.severity === severityFilter);
    return [...list].sort((a, b) => {
      const severityDiff = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
      if (severityDiff !== 0) return severityDiff;
      return (b.financialImpact?.amount ?? 0) - (a.financialImpact?.amount ?? 0);
    });
  }, [loadState, severityFilter]);

  if (loadState.status === "loading") {
    return <InsightsLoading />;
  }

  if (loadState.status === "error") {
    return (
      <DataState
        kind="error"
        title="دریافت بینش‌ها ناموفق بود"
        description={loadState.message}
        actionLabel="تلاش دوباره"
        onAction={() => void loadInsights()}
      />
    );
  }

  const countBySeverity = (value: InsightSeverity): number =>
    loadState.insights.filter((insight) => insight.severity === value).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label="فیلتر بر اساس شدت بینش">
        {SEVERITY_FILTER_OPTIONS.map((option) => {
          const isActive = severityFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => setSeverityFilter(option.value)}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {option.label}
              {option.value !== "all" && (
                <span className="tabular-nums text-xs text-muted-foreground">{countBySeverity(option.value)}</span>
              )}
            </button>
          );
        })}
      </div>

      {filteredInsights.length === 0 ? (
        <DataState
          kind="empty"
          title="بینشی با این فیلتر نیست"
          description="فیلتر شدت را تغییر دهید یا بازه دیگری انتخاب کنید."
          actionLabel="نمایش همه"
          onAction={() => setSeverityFilter("all")}
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {filteredInsights.map((insight) => (
            <InsightListItem key={insight.id} insight={insight} onOpen={() => navigate(getInsightPath(insight.id))} />
          ))}
        </ul>
      )}
    </div>
  );
}

function InsightListItem({ insight, onOpen }: { insight: Insight; onOpen: () => void }) {
  const meta = SEVERITY_META[insight.severity];
  return (
    <li>
      <Card className="transition-colors hover:border-primary/40">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{insight.title}</CardTitle>
            <Badge className={meta.className}>{meta.label}</Badge>
          </div>
          <CardDescription className="line-clamp-2">{insight.summary}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <CircleDollarSign aria-hidden="true" className="size-4 text-primary" />
            {insight.financialImpact !== undefined ? (
              <>اثر مالی تقریبی: <strong className="font-medium text-foreground">{formatAmount(insight.financialImpact.amount)}</strong> ریال</>
            ) : (
              "اثر مالی: —"
            )}
          </span>
          <span className="text-muted-foreground">اطمینان: {formatPercent(insight.confidence)}</span>
          <Button variant="outline" className="gap-1.5" onClick={onOpen}>
            جزئیات و اقدام‌ها
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Button>
        </CardContent>
      </Card>
    </li>
  );
}

function InsightsLoading() {
  return (
    <div className="flex flex-col gap-4" aria-label="در حال بارگذاری بینش‌ها">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-36 rounded-lg border border-border bg-card/40" />
      ))}
    </div>
  );
}

function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`;
}

function formatAmount(value: number): string {
  return value.toLocaleString("fa-IR");
}