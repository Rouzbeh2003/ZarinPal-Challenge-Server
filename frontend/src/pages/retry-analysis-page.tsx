import { useCallback, useEffect, useState } from "react";
import { Info } from "lucide-react";
import type { RetryAnalysis } from "@/api/types";
import { getRetryAnalysis } from "@/api/adapter";
import { resolveDateRange, useGlobalFilters } from "@/lib/global-filters";
import { RetryCards } from "@/components/dashboard/retry-cards";
import { RetryBreakdownTable } from "@/components/dashboard/retry-breakdown-table";
import { DataState } from "@/components/ui/data-state";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; analysis: RetryAnalysis };

export function RetryAnalysisPage() {
  const { merchantKey, dateRangePreset } = useGlobalFilters();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  const loadAnalysis = useCallback(async () => {
    setLoadState({ status: "loading" });
    try {
      const dateRange = resolveDateRange(dateRangePreset);
      const analysis = await getRetryAnalysis({ merchantKey, ...dateRange });
      setLoadState({ status: "ready", analysis });
    } catch (error) {
      setLoadState({ status: "error", message: error instanceof Error ? error.message : "خطای ناشناخته" });
    }
  }, [merchantKey, dateRangePreset]);

  useEffect(() => {
    void loadAnalysis();
  }, [loadAnalysis]);

  if (loadState.status === "loading") {
    return (
      <div className="flex flex-col gap-6" aria-label="در حال بارگذاری تحلیل تلاش مجدد">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-lg border border-border bg-card/40" />
          ))}
        </div>
        <div className="h-80 rounded-lg border border-border bg-card/40" />
      </div>
    );
  }

  if (loadState.status === "error") {
    return (
      <DataState
        kind="error"
        title="دریافت تحلیل تلاش مجدد ناموفق بود"
        description={loadState.message}
        actionLabel="تلاش دوباره"
        onAction={() => void loadAnalysis()}
      />
    );
  }

  const { analysis } = loadState;

  return (
    <div className="flex flex-col gap-6">
      <RetryCards
        retryRate={analysis.retryRate}
        recoveryRate={analysis.recoveryRate}
        recoveredAmount={analysis.recoveredAmount}
        atRiskAmount={analysis.atRiskAmount}
        formatPercent={formatPercent}
        formatAmount={formatAmount}
      />

      <section aria-label="درباره تحلیل تلاش مجدد" className="flex items-start gap-2 rounded-lg border border-border bg-card/40 p-4">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="flex flex-col gap-1 text-sm leading-6">
          <p>
            <strong className="font-medium">نرخ تلاش مجدد:</strong> سشن‌های با بیش از یک تلاش واقعی به کل سشن‌های دارای تلاش واقعی.
          </p>
          <p>
            <strong className="font-medium">نرخ بازیابی:</strong> سشن‌های ناموفقِ بازیابی‌شده به سشن‌های دارای تلاش مجدد.
          </p>
          <p>
            <strong className="font-medium">مبلغ در معرض ازدست‌رفتن:</strong> بالقوه است و زیان قطعی محسوب نمی‌شود.
          </p>
        </div>
      </section>

      <RetryBreakdownTable rows={analysis.breakdown} formatPercent={formatPercent} formatAmount={formatAmount} formatCount={formatCount} />
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