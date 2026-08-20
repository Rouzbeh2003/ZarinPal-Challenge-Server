import { useCallback, useState } from "react";
import { Bot, ListChecks, MessageCircleQuestion, Sparkles } from "lucide-react";
import type { AdvisorResponse } from "@/api/types";
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
            مشاور پرداخت (Advisor)
          </CardTitle>
          <CardDescription>
            تحلیل چندبعدی دادهٔ پذیرنده بههمراه روایت تولیدشده با مدل زبانی (LLM) — پاسخ همیشه مبتنی بر شواهد تجمیعی است.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label className="grid gap-1.5 text-sm font-medium">
            <span>سؤال شما</span>
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="مثلاً: مهم‌ترین اقدام برای بهبود پرداخت چیست؟"
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
            {advisor.advisor_narrative.answer !== undefined && <p>{advisor.advisor_narrative.answer}</p>}
            {advisor.advisor_narrative.key_findings !== undefined && (
              <NarrativeList title="یافته‌های کلیدی" items={advisor.advisor_narrative.key_findings} />
            )}
            {advisor.advisor_narrative.next_actions !== undefined && (
              <NarrativeList title="اقدام‌های بعدی" items={advisor.advisor_narrative.next_actions} />
            )}
            {advisor.advisor_narrative.caveats !== undefined && (
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