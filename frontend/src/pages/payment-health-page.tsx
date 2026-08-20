import { useCallback, useEffect, useState } from "react";
import type { PaymentHealth } from "@/api/types";
import { getPaymentHealth } from "@/api/adapter";
import { resolveDateRange, useGlobalFilters } from "@/lib/global-filters";
import { PspComparison } from "@/components/dashboard/psp-comparison";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { DataState } from "@/components/ui/data-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; health: PaymentHealth };

export function PaymentHealthPage() {
  const { merchantKey, dateRangePreset } = useGlobalFilters();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  const loadHealth = useCallback(async () => {
    setLoadState({ status: "loading" });
    try {
      const dateRange = resolveDateRange(dateRangePreset);
      const health = await getPaymentHealth({ merchantKey, ...dateRange });
      if (health.funnel.length === 0) {
        setLoadState({ status: "error", message: "داده قیف برای این بازه موجود نیست." });
        return;
      }
      setLoadState({ status: "ready", health });
    } catch (error) {
      setLoadState({ status: "error", message: error instanceof Error ? error.message : "خطای ناشناخته" });
    }
  }, [merchantKey, dateRangePreset]);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  if (loadState.status === "loading") {
    return <HealthLoading />;
  }

  if (loadState.status === "error") {
    return (
      <DataState
        kind="error"
        title="دریافت داده سلامت پرداخت ناموفق بود"
        description={loadState.message}
        actionLabel="تلاش دوباره"
        onAction={() => void loadHealth()}
      />
    );
  }

  const { health } = loadState;

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="نرخ موفقیت" className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">نرخ موفقیت کل</CardTitle>
            <CardDescription>سشن‌های موفق / سشن‌های معتبر در بازه</CardDescription>
          </CardHeader>
          <CardContent className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums">{formatPercent(health.successRate.value)}</span>
            <span className="text-sm text-muted-foreground">
              (تغییر {formatPercent(health.successRate.absoluteChange ?? 0)} نسبت به دوره قبل)
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">مبلغ در معرض ازدست‌رفتن</CardTitle>
            <CardDescription>مجموع سشن‌های ناموفق نهایی (بالقوه)</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-semibold tabular-nums text-red-400">
              {formatAmount(health.atRiskAmount)}
            </span>
            <p className="mt-1 text-xs text-muted-foreground">واحد: ریال — این مبلغ زیان قطعی نیست.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">سشن‌های معتبر</CardTitle>
            <CardDescription>مجموع سشن‌های داخل بازه</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-semibold tabular-nums">
              {formatCount(health.pspBreakdown.reduce((sum, p) => sum + p.sessionCount, 0))}
            </span>
            <p className="mt-1 text-xs text-muted-foreground">بر اساس مجموع PSPها (تقریبی)</p>
          </CardContent>
        </Card>
      </section>

      <section aria-label="مقایسه PSP و قیف" className="grid gap-6 lg:grid-cols-2">
        <PspComparison
          pspBreakdown={health.pspBreakdown}
          formatPercent={formatPercent}
          formatAmount={formatAmount}
        />
        <FunnelChart stages={health.funnel} formatAmount={formatAmount} formatCount={formatCount} />
      </section>
    </div>
  );
}

function HealthLoading() {
  return (
    <div className="flex flex-col gap-6" aria-label="در حال بارگذاری سلامت پرداخت">
      <div className="grid gap-6 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 w-32 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-9 w-28 rounded bg-muted/40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-lg border border-border bg-card/40" />
        <div className="h-72 rounded-lg border border-border bg-card/40" />
      </div>
    </div>
  );
}

function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`;
}

function formatAmount(value: number): string {
  return value.toLocaleString("fa-IR");
}

function formatCount(value: number): string {
  return value.toLocaleString("fa-IR");
}