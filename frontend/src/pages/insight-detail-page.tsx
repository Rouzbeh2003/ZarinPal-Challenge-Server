import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, CircleDollarSign, ListChecks, Scale, SlidersHorizontal } from "lucide-react";
import type { Insight } from "@/api/types";
import { getInsightDetail } from "@/api/adapter";
import { appRoutes, getInsightTracePath } from "@/lib/navigation";
import { SEVERITY_META } from "@/lib/severity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataState } from "@/components/ui/data-state";
import { InsightLlmAdvice } from "@/components/dashboard/insight-llm-advice";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; insight: Insight };

export function InsightDetailPage() {
  const { insightId } = useParams<{ insightId: string }>();
  const navigate = useNavigate();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  const loadDetail = useCallback(async () => {
    setLoadState({ status: "loading" });
    try {
      if (insightId === undefined) {
        throw new Error("شناسه بینش مشخص نشده است.");
      }
      const insight = await getInsightDetail(insightId);
      setLoadState({ status: "ready", insight });
    } catch (error) {
      setLoadState({ status: "error", message: error instanceof Error ? error.message : "خطای ناشناخته" });
    }
  }, [insightId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  if (loadState.status === "loading") {
    return (
      <div className="flex flex-col gap-4" aria-label="در حال بارگذاری جزئیات بینش">
        <div className="h-10 w-2/3 rounded-lg bg-muted/60" />
        <div className="h-40 rounded-lg border border-border bg-card/40" />
        <div className="h-40 rounded-lg border border-border bg-card/40" />
      </div>
    );
  }

  if (loadState.status === "error") {
    return (
      <DataState
        kind="error"
        title="دریافت جزئیات بینش ناموفق بود"
        description={loadState.message}
        actionLabel="بازگشت به فهرست"
        onAction={() => navigate(appRoutes.insights)}
      />
    );
  }

  const { insight } = loadState;
  const severityMeta = SEVERITY_META[insight.severity];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button
          variant="ghost"
          className="mb-3 justify-start gap-2 px-0 text-muted-foreground"
          onClick={() => navigate(appRoutes.insights)}
        >
          <ArrowRight aria-hidden="true" className="size-4" />
          بازگشت به فهرست بینش‌ها
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{insight.title}</h1>
          <Badge className={severityMeta.className}>{severityMeta.label}</Badge>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{insight.summary}</p>
      </div>

      <section aria-label="اعداد معیار" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricValueCard label="مقدار فعلی" value={formatPercent(insight.metric.current)} />
        <MetricValueCard label="مقدار پایه (baseline)" value={formatPercent(insight.metric.baseline)} icon={<Scale aria-hidden="true" className="size-4 text-primary" />} />
        <MetricValueCard label="تغییر مطلق" value={formatSignedPercent(insight.metric.absoluteChange)} tone={insight.metric.absoluteChange < 0 ? "negative" : "positive"} />
        <MetricValueCard label="تغییر نسبی" value={formatSignedPercent(insight.metric.relativeChange)} tone={insight.metric.relativeChange < 0 ? "negative" : "positive"} />
      </section>

      {insight.adjustedAnalysis !== undefined && insight.adjustedAnalysis.adjustedEffect !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale aria-hidden="true" className="size-4 text-primary" />
              اثر خام در برابر اثر تعدیل‌شده بر اساس PSP و بازه مبلغ
            </CardTitle>
            <CardDescription>
              تعدیل مستقیم بر اساس ترکیب PSP و بازه مبلغ؛ برای تفکیک تغییر عملکرد از تغییر ترکیب تراکنش‌ها
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <MetricComparison label="اثر خام" value={formatSignedPercent(insight.adjustedAnalysis.rawEffect ?? insight.metric.absoluteChange)} />
            <MetricComparison label="اثر تعدیل‌شده" value={formatSignedPercent(insight.adjustedAnalysis.adjustedEffect)} />
            <MetricComparison label="پوشش مشترک لایه‌ها" value={formatPercent(insight.adjustedAnalysis.commonSupportCoverage)} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDollarSign aria-hidden="true" className="size-4 text-primary" />
              اثر مالی تقریبی
            </CardTitle>
            <CardDescription>{insight.financialImpact?.method}</CardDescription>
          </CardHeader>
          <CardContent>
            {insight.financialImpact !== undefined && insight.financialImpact.amount > 0 ? (
              <p className="text-2xl font-semibold tabular-nums">
                {formatAmount(insight.financialImpact.amount)} <span className="text-sm font-normal text-muted-foreground">ریال</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {insight.type.includes("improvement") ? "بدون اثر مالی (بهبود شناسایی شده)" : "اثر مالی برآورد نشده است."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal aria-hidden="true" className="size-4 text-primary" />
              عوامل مرتبط
            </CardTitle>
            <CardDescription>سهم هر عامل در تغییر شناسایی‌شده</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {insight.drivers.length === 0 ? (
              <p className="text-sm text-muted-foreground">عامل مرتبطی ثبت نشده است.</p>
            ) : (
              insight.drivers.map((driver, _, all) => {
              const maxChange = Math.max(...all.map((d) => Math.abs(d.contribution)), 0.0001);
              return (
                <div key={`${driver.factor}-${driver.value}`} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{DRIVER_LABELS[driver.factor] ?? driver.factor}: {driver.value}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {driver.contribution > 0 ? "+" : ""}{formatPercent(driver.contribution)} تغییر نرخ
                    </span>
                  </div>
                  <div dir="ltr" className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${(Math.abs(driver.contribution) / maxChange) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks aria-hidden="true" className="size-4 text-primary" />
            اقدام‌های پیشنهادی
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insight.actionPlan !== undefined && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-6 text-amber-100">
              <strong>ظرفیت مالی مشترک برنامه:</strong> {formatAmount(insight.actionPlan.potentialFinancialImpact)} ریال. {insight.actionPlan.note}
            </div>
          )}
          {insight.recommendedActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">اقدام پیشنهادی ثبت نشده است.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {insight.recommendedActions.map((action, index) => (
                <li key={action.title} className="flex gap-3 py-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary tabular-nums">
                    {index + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{action.title}</span>
                    <span className="text-xs leading-5 text-muted-foreground">{action.description}</span>
                    {action.targetValue !== undefined && (
                      <span className="text-xs text-primary">
                        هدف: {formatPercent(action.targetValue)} در {action.horizonDays?.toLocaleString("fa-IR")} روز
                        {action.potentialFinancialImpact !== undefined && action.potentialFinancialImpact > 0
                          ? ` · سهم از ظرفیت مشترک ${formatAmount(action.potentialFinancialImpact)} ریال (غیرقابل‌جمع)`
                          : ""}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <InsightLlmAdvice insight={insight} />
        </CardContent>
      </Card>

      <section aria-label="اعتبار و ردیابی" className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-card/40 p-4 text-sm">
        <span>
          اطمینان: <strong className="font-medium tabular-nums">{formatPercent(insight.confidence)}</strong>
        </span>
        <span>
          پوشش متریک اصلی: <strong className="font-medium tabular-nums">{formatPercent(insight.coverage)}</strong>
        </span>
        {insight.coverageDetails !== undefined && (
          <span className="text-muted-foreground">
            پوشش تحلیل تعدیل‌شده: <strong className="font-medium tabular-nums">{formatPercent(insight.coverageDetails.adjustedCoverage)}</strong>
            {` · ${insight.coverageDetails.excludedRecords.toLocaleString("fa-IR")} کنارگذاشته · ${insight.coverageDetails.adjustedNullRecords.toLocaleString("fa-IR")} ناقص برای تعدیل`}
          </span>
        )}
        <span className="text-muted-foreground">
          بازه: {formatDateRange(insight.period)}
        </span>
        <Button
          variant="outline"
          className="gap-1 text-xs"
          onClick={() => navigate(getInsightTracePath(insight.id))}
        >
          مشاهده ردیابی محاسبه (trace)
        </Button>
      </section>
    </div>
  );
}

function MetricValueCard({ label, value, icon, tone }: { label: string; value: string; icon?: ReactNode; tone?: "positive" | "negative" }) {
  const toneClass = tone === "positive" ? "text-emerald-400" : tone === "negative" ? "text-red-400" : "";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

const DRIVER_LABELS: Record<string, string> = {
  psp: "درگاه پرداخت",
  issuer_bank: "بانک صادرکننده",
  terminal: "ترمینال",
  amount_bucket: "بازه مبلغ",
  verify_type: "نوع تأیید",
  attempts_count: "تعداد تلاش",
  switch_response_code: "کد پاسخ",
  hour_of_day: "ساعت",
  day_of_week: "روز هفته",
  customer_type: "نوع مشتری",
};

function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`;
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPercent(value)}`;
}

function formatAmount(value: number): string {
  return value.toLocaleString("fa-IR");
}

function formatDateRange(period: { dateFrom: string; dateTo: string }): string {
  const from = new Date(period.dateFrom);
  const to = new Date(period.dateTo);
  const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
  return `${from.toLocaleDateString("fa-IR", options)} تا ${to.toLocaleDateString("fa-IR", options)}`;
}

function MetricComparison({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
