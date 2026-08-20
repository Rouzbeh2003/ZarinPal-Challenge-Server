import { AlertTriangle, CircleCheck, Clock, Info } from "lucide-react";
import type { PaymentHealth } from "@/api/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type HealthSummaryProps = {
  health: PaymentHealth;
  formatPercent: (value: number) => string;
  formatAmount: (value: number) => string;
};

export function HealthSummary({ health, formatPercent, formatAmount }: HealthSummaryProps) {
  const rate = health.successRate;
  const okPsps = health.pspBreakdown.filter((p) => p.status === "ok").length;
  const attentionPsps = health.pspBreakdown.filter((p) => p.status === "attention").length;
  const criticalPsps = health.pspBreakdown.filter((p) => p.status === "critical").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle aria-hidden="true" className="size-4 text-primary" />
          خلاصه سلامت پرداخت
        </CardTitle>
        <CardDescription>وضعیت کلی بر اساس نرخ موفقیت و PSPها</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">نرخ موفقیت کل</span>
          <span className="text-lg font-semibold tabular-nums">{formatPercent(rate.value)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">تغییر نسبت به دوره قبل</span>
          <span className="text-sm font-medium tabular-nums">{formatPercent(rate.absoluteChange ?? 0)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            <CircleCheck aria-hidden="true" className="size-3 text-emerald-400" />
            {okPsps} PSP پایدار
          </Badge>
          <Badge variant="secondary">
            <Clock aria-hidden="true" className="size-3 text-amber-400" />
            {attentionPsps} PSP در وضعیت توجه
          </Badge>
          <Badge variant="destructive">
            <AlertTriangle aria-hidden="true" className="size-3" />
            {criticalPsps} PSP بحرانی
          </Badge>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
          <span className="text-sm text-muted-foreground">مبلغ در معرض ازدست‌رفتن (بالقوه)</span>
          <span className="text-sm font-semibold tabular-nums text-red-400">
            {formatAmount(health.atRiskAmount)}
          </span>
        </div>
        <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          این مبلغ «در معرض از دست رفتن» است، نه زیان قطعی؛ بر اساس سشن‌های ناموفق نهایی در بازه.
        </p>
      </CardContent>
    </Card>
  );
}