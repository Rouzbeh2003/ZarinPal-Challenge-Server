import type { ReactNode } from "react";
import { RefreshCcw, ShieldCheck, RotateCcw, CircleDollarSign } from "lucide-react";
import type { KpiMetric } from "@/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RetryCardsProps = {
  retryRate: KpiMetric;
  recoveryRate: KpiMetric;
  recoveredAmount: number;
  atRiskAmount: number;
  formatPercent: (value: number) => string;
  formatAmount: (value: number) => string;
};

/** چهار کارت شاخص تحلیل تلاش مجدد. */
export function RetryCards({ retryRate, recoveryRate, recoveredAmount, atRiskAmount, formatPercent, formatAmount }: RetryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={<RefreshCcw aria-hidden="true" className="size-4 text-primary" />}
        title="نرخ تلاش مجدد"
        value={formatPercent(retryRate.value)}
        change={formatPercent(retryRate.absoluteChange ?? 0)}
        note="سشن‌های با بیش از یک تلاش واقعی"
      />
      <MetricCard
        icon={<ShieldCheck aria-hidden="true" className="size-4 text-emerald-400" />}
        title="نرخ بازیابی"
        value={formatPercent(recoveryRate.value)}
        change={formatPercent(recoveryRate.absoluteChange ?? 0)}
        note="سشن‌های ناموفقِ بازیابی‌شده"
      />
      <MetricCard
        icon={<RotateCcw aria-hidden="true" className="size-4 text-amber-400" />}
        title="مبلغ بازیابی‌شده"
        value={formatAmount(recoveredAmount)}
        note="مجموع سشن‌های موفق پس از تلاش مجدد"
      />
      <MetricCard
        icon={<CircleDollarSign aria-hidden="true" className="size-4 text-red-400" />}
        title="در معرض ازدست‌رفتن"
        value={formatAmount(atRiskAmount)}
        note="بالقوه — زیان قطعی نیست"
        highlight="text-red-400"
      />
    </div>
  );
}

function MetricCard({
  icon,
  title,
  value,
  change,
  note,
  highlight,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  change?: string;
  note: string;
  highlight?: string;
}) {
  return (
    <Card className="gap-2">
      <CardHeader className="px-5 pt-5">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <p className={`text-2xl font-semibold tabular-nums ${highlight ?? ""}`}>{value}</p>
        {change !== undefined && (
          <p className="mt-1 text-xs text-muted-foreground">تغییر: {change} نسبت به دوره قبل</p>
        )}
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}