import { useCallback, useState } from "react";
import { Bot, ChartNoAxesCombined, ListChecks, MessageCircleQuestion, Sparkles, Target } from "lucide-react";
import type { AdvisorNarrativeAction, AdvisorNarrativeNeed, AdvisorResponse } from "@/api/types";
import { getAdvisor } from "@/api/adapter";
import { resolveDateRange, useGlobalFilters } from "@/lib/global-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataState } from "@/components/ui/data-state";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; advisor: AdvisorResponse };

const PRIORITY_META: Record<string, { label: string; className: string }> = {
  high: { label: "اولویت بالا", className: "bg-red-500/15 text-red-300 border-red-500/40" },
  medium: { label: "اولویت متوسط", className: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
  low: { label: "اولویت کم", className: "bg-slate-500/15 text-slate-300 border-slate-500/40" },
};

export function AdvisorPage() {
  const { merchantKey, dateRangePreset } = useGlobalFilters();
  const [question, setQuestion] = useState("");
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle" });

  const runAdvisor = useCallback(async () => {
    setLoadState({ status: "loading" });
    try {
      const range = resolveDateRange(dateRangePreset);
      const advisor = await getAdvisor(merchantKey, range.dateFrom, range.dateTo, question.trim() || "");
      setLoadState({ status: "ready", advisor });
    } catch (error) {
      setLoadState({ status: "error", message: error instanceof Error ? error.message : "خطای ناشناخته" });
    }
  }, [merchantKey, dateRangePreset, question]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircleQuestion aria-hidden="true" className="size-4 text-primary" />
            مشاور هوشمند کسب‌وکار پذیرنده
          </CardTitle>
          <CardDescription>
            تحلیل تقاضا، ارزش فروش، تجربه مشتری، عملیات و سلامت پرداخت همراه با پیش‌بینی نیازهای احتمالی پذیرنده.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label className="grid gap-1.5 text-sm font-medium">
            <span>سؤال شما</span>
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="مثلاً: برای رشد فروش و بازگشت مشتری در ماه آینده روی چه چیزی تمرکز کنم؟"
              onKeyDown={(event) => {
                if (event.key === "Enter") void runAdvisor();
              }}
            />
          </label>
          <Button onClick={() => void runAdvisor()} disabled={loadState.status === "loading"}>
            {loadState.status === "loading" ? "در حال تحلیل..." : "تحلیل و دریافت مشاوره"}
          </Button>
        </CardContent>
      </Card>

      {loadState.status === "error" && (
        <DataState
          kind="error"
          title="دریافت مشاوره ناموفق بود"
          description={loadState.message}
          actionLabel="تلاش دوباره"
          onAction={() => void runAdvisor()}
        />
      )}

      {loadState.status === "ready" && (
        <AdvisorResult advisor={loadState.advisor} />
      )}
    </div>
  );
}

function AdvisorResult({ advisor }: { advisor: AdvisorResponse }) {
  const trendItems = [
    ["تقاضای روزانه", advisor.trends.changes.sessions_per_active_day],
    ["فروش موفق", advisor.trends.changes.successful_amount],
    ["میانگین مبلغ خرید", advisor.trends.changes.average_ticket],
    ["نرخ موفقیت پرداخت", advisor.trends.changes.success_rate],
  ] as const;
  return (
    <div className="flex flex-col gap-6">
      {advisor.advisor_narrative !== null ? (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles aria-hidden="true" className="size-4 text-primary" />
              روایت مشاور (LLM)
              {advisor.narrative_source === "llm" && (
                <Badge variant="secondary">تولیدشده با مدل زبانی</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm leading-7">
            <p>{advisor.advisor_narrative.answer}</p>
            {advisor.advisor_narrative.key_findings.length > 0 && (
              <NarrativeList title="یافته‌های کلیدی" items={advisor.advisor_narrative.key_findings} />
            )}
            {advisor.advisor_narrative.predicted_needs.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">نیازهای احتمالی از نگاه مدل</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {advisor.advisor_narrative.predicted_needs.map((need, index) => <NarrativeNeedCard key={`${need.need}-${index}`} need={need} />)}
                </div>
              </div>
            )}
            {advisor.advisor_narrative.growth_opportunities.length > 0 && (
              <NarrativeList title="فرصت‌های رشد" items={advisor.advisor_narrative.growth_opportunities} />
            )}
            {advisor.advisor_narrative.next_actions.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">برنامه اقدام پیشنهادی</p>
                <div className="flex flex-col gap-3">
                  {advisor.advisor_narrative.next_actions.map((action, index) => <NarrativeActionCard key={`${action.action}-${index}`} action={action} index={index} />)}
                </div>
              </div>
            )}
            {advisor.advisor_narrative.caveats.length > 0 && (
              <div className="rounded-lg border border-dashed border-border p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">نکات احتیاطی</p>
                <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {advisor.advisor_narrative.caveats.map((caveat, index) => (
                    <li key={toKey(caveat, index)}>• {toDisplay(caveat)}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Bot aria-hidden="true" className="size-4" />
            روایت LLM در دسترس نیست؛ تحلیل قطعی (deterministic) نمایش داده می‌شود.
            {advisor.narrative_source === "deterministic_engine_fallback" && " (مدل زبانی پاسخ نداد؛ بررسی VPN یا تنظیمات LLM)"}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ChartNoAxesCombined className="size-4 text-primary" />روندهای کسب‌وکار</CardTitle>
          <CardDescription>تغییر نیمه اخیر نسبت به نیمه اول بازه انتخابی</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trendItems.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`mt-2 text-xl font-semibold tabular-nums ${value === null ? "text-muted-foreground" : value < 0 ? "text-red-400" : "text-emerald-400"}`}>
                {formatChange(value)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Target className="size-4 text-primary" />نیازهای پیش‌بینی‌شده پذیرنده</CardTitle>
          <CardDescription>فرضیه‌های رتبه‌بندی‌شده بر پایه داده؛ برای تصمیم نهایی باید اعتبارسنجی شوند.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {advisor.predicted_needs.map((need) => (
            <div key={need.code} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{need.area}</p>
                <Badge variant="secondary">اطمینان {formatPercent(need.confidence)}</Badge>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground"><strong>شاهد:</strong> {need.evidence}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground"><strong>اعتبارسنجی:</strong> {need.validation}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks aria-hidden="true" className="size-4 text-primary" />
            خلاصه اجرایی
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm leading-7">
            {advisor.executive_summary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">توصیه‌های اولویت‌دار</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {advisor.recommendations.map((recommendation) => {
            const priority = PRIORITY_META[recommendation.priority];
            return (
              <div key={recommendation.code} className="flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{recommendation.title}</span>
                  <Badge className={priority.className}>{priority.label}</Badge>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{recommendation.rationale}</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  <strong>شاخص مورد انتظار:</strong> {recommendation.expected_signal}
                </p>
                <p className="text-xs leading-5 text-muted-foreground">
                  <strong>حد نگهبان:</strong> {recommendation.guardrail}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

/** اگر آیتم یک object باشد (مثل {action, why})، فیلد متنی آن را استخراج می‌کند. */
function toDisplay(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidate =
      record["action"] ?? record["why"] ?? record["reason"] ?? record["title"] ?? record["text"] ?? record["content"];
    if (typeof candidate === "string") return candidate;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function toKey(value: unknown, index: number): string {
  if (typeof value === "string") return value;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const id = record["id"] ?? record["action"] ?? record["code"];
    if (typeof id === "string") return id;
  }
  return `${index}`;
}

function NarrativeList({ title, items }: { title: string; items: unknown[] }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium">{title}</p>
      <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={toKey(item, index)}>• {toDisplay(item)}</li>
        ))}
      </ul>
    </div>
  );
}

function NarrativeNeedCard({ need }: { need: AdvisorNarrativeNeed }) {
  return <div className="rounded-lg border border-border p-3">
    <div className="flex justify-between gap-2"><span className="font-medium">{need.need ?? "نیاز پیشنهادی"}</span>{need.confidence && <Badge variant="outline">{need.confidence}</Badge>}</div>
    {need.evidence && <p className="mt-2 text-xs text-muted-foreground"><strong>شاهد:</strong> {need.evidence}</p>}
    {need.validation && <p className="mt-1 text-xs text-muted-foreground"><strong>آزمون:</strong> {need.validation}</p>}
  </div>;
}

function NarrativeActionCard({ action, index }: { action: AdvisorNarrativeAction; index: number }) {
  return <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
    <p className="font-medium">{index + 1}. {action.action ?? "اقدام پیشنهادی"}</p>
    {action.why && <p className="mt-2 text-xs text-muted-foreground">{action.why}</p>}
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {action.kpi && <p className="text-xs"><strong>KPI:</strong> {action.kpi}</p>}
      {action.guardrail && <p className="text-xs"><strong>Guardrail:</strong> {action.guardrail}</p>}
    </div>
  </div>;
}

function formatPercent(value: number): string { return `${(value * 100).toLocaleString("fa-IR", { maximumFractionDigits: 0 })}٪`; }
function formatChange(value: number | null): string {
  if (value === null) return "داده ناکافی";
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`;
}
