import { Database, Filter, GitBranch, Hash, ScanSearch } from "lucide-react";
import type { Trace } from "@/api/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TraceDetailProps = {
  trace: Trace;
  formatPercent: (value: number) => string;
  formatCount: (value: number) => string;
};

/** بخش‌های تعریف، فیلتر، محاسبه و پوشش یک trace. */
export function TraceDetail({ trace, formatPercent, formatCount }: TraceDetailProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database aria-hidden="true" className="size-4 text-primary" />
            تعریف معیار
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <InfoRow label="نام معیار" value={METRIC_NAMES[trace.metricName] ?? trace.metricName} />
          <InfoRow label="نسخه تعریف" value={trace.definitionVersion} dir="ltr" />
          <InfoRow label="سطح محاسبه" value={trace.calculationLevel === "session" ? "سشن" : "تلاش"} />
          <InfoRow label="نسخه دیتاست" value={trace.datasetVersion} dir="ltr" />
          <InfoRow label="شناسه ورود داده" value={trace.ingestionRunId} dir="ltr" />
          <InfoRow label="شناسه محاسبه" value={trace.queryTemplateId} dir="ltr" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch aria-hidden="true" className="size-4 text-primary" />
            صورت و مخرج
          </CardTitle>
          <CardDescription>فرمول انسانی معیار</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="rounded-lg border border-border bg-muted/40 p-3" dir="ltr">
            <span className="text-xs text-muted-foreground">نسبت: </span>
            {trace.numerator} / {trace.denominator}
          </div>
          <ul className="flex flex-col gap-1.5">
            {trace.formulas.map((formula) => (
              <li key={formula} className="font-mono text-xs text-muted-foreground" dir="ltr">
                {formula}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter aria-hidden="true" className="size-4 text-primary" />
            فیلترهای اعمال‌شده
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {trace.filters.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="gap-1">
              {filter.label}: <span dir="ltr" className="font-mono">{filter.value}</span>
            </Badge>
          ))}
          {trace.filters.length === 0 && <span className="text-sm text-muted-foreground">فیلتری اعمال نشده است.</span>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanSearch aria-hidden="true" className="size-4 text-primary" />
            پوشش و رکوردها
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <InfoRow label="پوشش داده" value={formatPercent(trace.dataCoverage)} />
          <InfoRow label="تعریف دوره پایه" value={translateBaseline(trace.baselineDefinition)} />
          <div className="grid grid-cols-3 gap-3">
            <CountBox label="رکورد ورودی" value={formatCount(trace.inputRecordCount)} />
            <CountBox label="رکورد خروجی" value={formatCount(trace.outputRecordCount)} />
            <CountBox label="حذف‌شده" value={formatCount(trace.excludedRecordCount)} tone="negative" />
          </div>
          {trace.exclusionReasons.length > 0 && (
            <ul className="flex flex-col gap-1">
              {trace.exclusionReasons.map((reason) => (
                <li key={reason} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Hash aria-hidden="true" className="size-3" />
                  {reason}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value, dir }: { label: string; value: string; dir?: "ltr" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums" dir={dir}>
        {value}
      </span>
    </div>
  );
}

function CountBox({ label, value, tone }: { label: string; value: string; tone?: "negative" }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-lg font-semibold tabular-nums ${tone === "negative" ? "text-red-400" : ""}`}>{value}</span>
    </div>
  );
}

const METRIC_NAMES: Record<string, string> = {
  success_rate: "نرخ موفقیت",
  retry_rate: "نرخ تلاش مجدد",
  retry_recovery_rate: "نرخ بازیابی تلاش مجدد",
  no_attempt_rate: "نرخ سشن بدون تلاش",
};

function translateBaseline(definition: string): string {
  if (definition.includes("previous_equal_length_period") || definition.includes("previous equal")) {
    return "دوره بلافاصله قبل با طول برابر";
  }
  return definition;
}