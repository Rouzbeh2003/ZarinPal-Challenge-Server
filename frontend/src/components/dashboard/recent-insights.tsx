import { Lightbulb } from "lucide-react";
import type { Insight } from "@/api/types";
import { SEVERITY_META } from "@/lib/severity";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type RecentInsightsProps = {
  insights: Insight[];
  onOpenInsight: (insightId: string) => void;
};

export function RecentInsights({ insights, onOpenInsight }: RecentInsightsProps) {
  if (insights.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          بینش جدیدی در این بازه ثبت نشده است.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb aria-hidden="true" className="size-4 text-primary" />
          بینش‌های اخیر
        </CardTitle>
        <CardDescription>پررنگ‌ترین تغییرهای شناسایی‌شده در بازه انتخابی</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {insights.map((insight) => (
          <button
            key={insight.id}
            type="button"
            onClick={() => onOpenInsight(insight.id)}
            className="flex flex-col gap-2 py-3 text-right transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <span className="flex flex-wrap items-center gap-2">
              <Badge className={SEVERITY_META[insight.severity].className}>{SEVERITY_META[insight.severity].label}</Badge>
              {insight.financialImpact !== undefined && (
                <span className="text-xs text-muted-foreground">
                  اثر مالی: {formatAmount(insight.financialImpact.amount)}
                </span>
              )}
            </span>
            <span className="text-sm font-medium">{insight.title}</span>
            <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">{insight.summary}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("fa-IR");
}