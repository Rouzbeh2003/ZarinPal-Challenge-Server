import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { KpiMetric } from "@/api/types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type KpiCardProps = {
  title: string;
  metric: KpiMetric;
  formatValue: (value: number, metric: KpiMetric) => string;
};

export function KpiCard({ title, metric, formatValue }: KpiCardProps) {
  const change = metric.absoluteChange;
  const trend = change === undefined ? "flat" : change > 0.0005 ? "up" : change < -0.0005 ? "down" : "flat";
  const isPositive = trend === "up";
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  return (
    <Card className="gap-3">
      <CardHeader className="px-5 pt-5">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-5 pb-5">
        <p className="text-2xl font-semibold tabular-nums">{formatValue(metric.value, metric)}</p>
        {change !== undefined && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs font-medium tabular-nums",
              trend === "flat" ? "text-muted-foreground" : isPositive ? "text-emerald-400" : "text-red-400",
            )}
          >
            <TrendIcon aria-hidden="true" className="size-3.5" />
            <span>{formatChange(change)} نسبت به دوره قبل</span>
          </span>
        )}
      </CardContent>
    </Card>
  );
}

function formatChange(change: number): string {
  const sign = change > 0 ? "+" : "";
  return `${sign}${(change * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`;
}

export function KpiCardSkeleton() {
  return (
    <Card className="gap-3">
      <CardHeader className="px-5 pt-5">
        <Skeleton className="h-4 w-20" />
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="mt-2 h-4 w-24" />
      </CardContent>
    </Card>
  );
}