import { ArrowDown } from "lucide-react";
import type { FunnelStage } from "@/api/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type FunnelChartProps = {
  stages: FunnelStage[];
  formatAmount: (value: number) => string;
  formatCount: (value: number) => string;
};

/** قیف پرداخت: هر مرحله به‌صورت نوار افقی با عرض متناسب با سهم سشن‌ها. */
export function FunnelChart({ stages, formatAmount, formatCount }: FunnelChartProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">قیف پرداخت</CardTitle>
        <CardDescription>از شروع تا تسویه؛ هر مرحله بر اساس سشن‌های یکتا</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {stages.map((stage, index) => {
          const dropPercent = index === 0 ? 0 : 1 - stage.count / stages[index - 1].count;
          return (
            <div key={stage.stageKey} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{stage.label}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatCount(stage.count)} سشن · {formatAmount(stage.amount)}
                </span>
              </div>
              <div dir="ltr" className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${(stage.count / maxCount) * 100}%` }}
                />
              </div>
              {dropPercent > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowDown aria-hidden="true" className="size-3" />
                  افت نسبت به مرحله قبل: {formatPercent(dropPercent)}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`;
}