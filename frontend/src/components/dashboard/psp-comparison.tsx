import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import type { PaymentHealth } from "@/api/types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type PspComparisonProps = {
  pspBreakdown: PaymentHealth["pspBreakdown"];
  formatPercent: (value: number) => string;
  formatAmount: (value: number) => string;
};

const STATUS_META: Record<PaymentHealth["pspBreakdown"][number]["status"], { label: string; icon: typeof CheckCircle2; className: string }> = {
  ok: { label: "پایدار", icon: CheckCircle2, className: "text-emerald-400" },
  attention: { label: "نیازمند توجه", icon: Clock, className: "text-amber-400" },
  critical: { label: "بحرانی", icon: AlertTriangle, className: "text-red-400" },
};

export function PspComparison({ pspBreakdown, formatPercent, formatAmount }: PspComparisonProps) {
  const maxSessions = Math.max(...pspBreakdown.map((p) => p.sessionCount), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">مقایسه PSP</CardTitle>
        <CardDescription>سهم سشن‌ها و نرخ موفقیت هر درگاه پرداخت</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {pspBreakdown.map((psp) => {
          const meta = STATUS_META[psp.status];
          const StatusIcon = meta.icon;
          return (
            <div key={psp.pspKey} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{psp.pspTitle}</span>
                  <Badge variant={psp.status === "critical" ? "destructive" : "secondary"} className="gap-1">
                    <StatusIcon aria-hidden="true" className={cn("size-3", meta.className, psp.status === "critical" && "text-red-300")} />
                    {meta.label}
                  </Badge>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  نرخ موفقیت: <span className="font-medium text-foreground">{formatPercent(psp.successRate)}</span>
                </span>
              </div>
              <div dir="ltr" className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    psp.status === "critical" ? "bg-red-500/70" : psp.status === "attention" ? "bg-amber-500/70" : "bg-emerald-500/70",
                  )}
                  style={{ width: `${(psp.sessionCount / maxSessions) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{psp.sessionCount.toLocaleString("fa-IR")} سشن</span>
                <span>در معرض ازدست‌رفتن: {formatAmount(psp.atRiskAmount)}</span>
              </div>
            </div>
          );
        })}
        <p className="text-xs leading-5 text-muted-foreground">
          مبلغ «در معرض ازدست‌رفتن» هر PSP بر اساس سشن‌های ناموفق نهایی محاسبه شده و زیان قطعی نیست.
        </p>
      </CardContent>
    </Card>
  );
}