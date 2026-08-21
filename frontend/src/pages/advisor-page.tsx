import { useCallback, useEffect, useState } from "react";
import { Bot, ChartNoAxesCombined, ChevronLeft, ChevronRight, Database, ListChecks, MessageCircleQuestion, Sparkles, Target } from "lucide-react";
import type { AdvisorNarrativeAction, AdvisorNarrativeNeed, AdvisorResponse, AdvisorTransactionEvidence } from "@/api/types";
import { getAdvisor, getAdvisorEvidence } from "@/api/adapter";
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
              روایت مشاور
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
            روایت مشاور در دسترس نیست؛ تحلیل داده‌محور نمایش داده می‌شود.
            {advisor.narrative_source === "deterministic_engine_fallback" && " لطفاً اتصال سرویس مشاور را بررسی یا دوباره تلاش کنید."}
          </CardContent>
        </Card>
      )}

      <AdvisorEvidenceTable advisor={advisor} />

      <PeerComparison comparison={advisor.peer_comparison} />

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

function PeerComparison({ comparison }: { comparison: AdvisorResponse["peer_comparison"] }) {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><ChartNoAxesCombined className="size-4 text-primary" />مقایسه با هم‌صنف‌ها</CardTitle>
        <CardDescription>{comparison.category_title || "صنف نامشخص"}؛ benchmark مقاوم بر پایه میانه و میانگین برابر‌وزن {comparison.peer_count.toLocaleString("fa-IR")} پذیرنده، بدون نمایش دادهٔ پذیرنده‌های دیگر</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {!comparison.available ? <p className="text-sm text-muted-foreground">برای این صنف دادهٔ هم‌گروه کافی در بازه انتخابی وجود ندارد.</p> : comparison.metrics.map((metric) => {
          const maximum = Math.max(metric.merchant_value ?? 0, metric.peer_value ?? 0, metric.peer_equal_weight_value ?? 0, metric.peer_median_value ?? 0, 1);
          const format = (value: number | null) => value === null ? "داده ناکافی" : metric.unit === "percent" ? formatPercent(value) : formatRials(Math.round(value));
          return <div key={metric.code} className="grid gap-2">
            <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium">{metric.label}</span><Badge variant="outline">{formatChange(metric.difference)}</Badge></div>
            <div className="grid gap-2 text-xs">
              <div className="grid grid-cols-[5rem_1fr_auto] items-center gap-2"><span>شما</span><div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full rounded bg-primary" style={{ width: `${((metric.merchant_value ?? 0) / maximum) * 100}%` }} /></div><span className="tabular-nums">{format(metric.merchant_value)}</span></div>
              <div className="grid grid-cols-[5rem_1fr_auto] items-center gap-2"><span>میانگین صنف</span><div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full rounded bg-sky-400" style={{ width: `${((metric.peer_value ?? 0) / maximum) * 100}%` }} /></div><span className="tabular-nums">{format(metric.peer_value)}</span></div>
              <div className="grid grid-cols-[5rem_1fr_auto] items-center gap-2"><span>برابر‌وزن</span><div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full rounded bg-violet-400" style={{ width: `${((metric.peer_equal_weight_value ?? 0) / maximum) * 100}%` }} /></div><span className="tabular-nums">{format(metric.peer_equal_weight_value ?? null)}</span></div>
              <div className="grid grid-cols-[5rem_1fr_auto] items-center gap-2"><span>میانه صنف</span><div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full rounded bg-emerald-400" style={{ width: `${((metric.peer_median_value ?? 0) / maximum) * 100}%` }} /></div><span className="tabular-nums">{format(metric.peer_median_value ?? null)}</span></div>
              {metric.merchant_percentile !== undefined && metric.merchant_percentile !== null && <p className="text-muted-foreground">صدک شما در cohort: {formatPercent(metric.merchant_percentile)}</p>}
            </div>
          </div>;
        })}
      </CardContent>
    </Card>
  );
}

const EVIDENCE_PAGE_SIZE = 10;

function AdvisorEvidenceTable({ advisor }: { advisor: AdvisorResponse }) {
  const [evidence, setEvidence] = useState<AdvisorTransactionEvidence | undefined>(advisor.transaction_evidence);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = evidence?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((evidence?.total ?? 0) / EVIDENCE_PAGE_SIZE));
  const currentPage = evidence?.page ?? 1;
  const rows = items;

  useEffect(() => {
    setEvidence(advisor.transaction_evidence);
    setError(null);
  }, [advisor]);

  async function loadPage(page: number) {
    setIsLoading(true);
    setError(null);
    try {
      setEvidence(await getAdvisorEvidence(
        advisor.merchant_key,
        advisor.period.date_from,
        advisor.period.date_to,
        page,
        EVIDENCE_PAGE_SIZE,
      ));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "دریافت تراکنش‌ها ناموفق بود.");
    } finally {
      setIsLoading(false);
    }
  }

  if (evidence === undefined) {
    return (
      <Card className="border-amber-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database aria-hidden="true" className="size-4 text-amber-400" />
            تراکنش‌های مبنای تحلیل
          </CardTitle>
          <CardDescription>
            تحلیل با موفقیت دریافت شد، اما سرویس بک‌اند فعلی هنوز جدول تراکنش‌ها را برنمی‌گرداند. بک‌اند را با نسخه جدید راه‌اندازی مجدد کنید.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database aria-hidden="true" className="size-4 text-primary" />
          تراکنش‌های مبنای تحلیل
          <Badge variant="secondary">{evidence.total.toLocaleString("fa-IR")} سشن</Badge>
        </CardTitle>
        <CardDescription>
          تمام سشن‌های منطبق با بازه و فیلترهای همین گزارش در دسترس‌اند. هر ردیف یک سشن پرداخت است.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">تراکنشی برای فیلترهای انتخابی وجود ندارد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-right text-xs text-muted-foreground">
                  <th scope="col" className="py-2 pr-3">تاریخ</th>
                  <th scope="col" className="px-2 py-2 text-center">شناسه سشن</th>
                  <th scope="col" className="px-2 py-2">مبلغ</th>
                  <th scope="col" className="px-2 py-2 text-center">وضعیت</th>
                  <th scope="col" className="px-2 py-2">تعداد تلاش</th>
                  <th scope="col" className="px-2 py-2 text-center">PSP</th>
                  <th scope="col" className="py-2 pl-3 text-center">بانک صادرکننده</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.session_key} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3 tabular-nums">{formatEvidenceDate(row.metric_date)}</td>
                    <td className="px-2 py-2.5 text-center font-mono text-xs" dir="ltr">{row.session_key}</td>
                    <td className="px-2 py-2.5 tabular-nums">{formatRials(row.amount)}</td>
                    <td className="px-2 py-2.5 text-center"><Badge variant="outline">{statusLabel(row.final_status)}</Badge></td>
                    <td className="px-2 py-2.5 tabular-nums">{row.attempts_count.toLocaleString("fa-IR")}</td>
                    <td className="px-2 py-2.5 text-center font-mono text-xs" dir="ltr">{row.final_psp_code ?? "—"}</td>
                    <td className="py-2.5 pl-3 text-center font-mono text-xs" dir="ltr">{row.final_issuer_bank_code ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {error !== null && <p className="text-xs text-red-400">{error}</p>}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">صفحه {currentPage.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" aria-label="صفحه قبل" disabled={currentPage === 1 || isLoading} onClick={() => void loadPage(currentPage - 1)}><ChevronRight aria-hidden="true" className="size-4" /></Button>
              <Button variant="outline" size="icon" aria-label="صفحه بعد" disabled={currentPage === totalPages || isLoading} onClick={() => void loadPage(currentPage + 1)}><ChevronLeft aria-hidden="true" className="size-4" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatRials(value: number): string { return `${value.toLocaleString("fa-IR")} ریال`; }
function formatEvidenceDate(value: string): string { return new Date(`${value}T00:00:00`).toLocaleDateString("fa-IR"); }
function statusLabel(value: string): string {
  return ({ successful: "موفق", unsuccessful: "ناموفق", excluded: "حذف‌شده" } as Record<string, string>)[value] ?? value;
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
