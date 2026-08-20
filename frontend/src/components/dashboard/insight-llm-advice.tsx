import { useCallback, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import type { AdvisorNarrative, AdvisorResponse, Insight } from "@/api/types";
import { getAdvisor } from "@/api/adapter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type InsightLlmAdviceProps = {
  insight: Insight;
};

type AdviceState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; narrative: AdvisorNarrative; source: AdvisorResponse["narrative_source"] };

const DRIVER_LABELS: Record<string, string> = {
  psp: "درگاه پرداخت",
  issuer_bank: "بانک صادرکننده",
  terminal: "ترمینال",
  amount_bucket: "بازه مبلغ",
  attempts_count: "تعداد تلاش",
  hour: "ساعت",
  day_of_week: "روز هفته",
};

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

/** اگر آیتم object با فیلد why/reason داشت، آن را برمی‌گرداند؛ وگرنه null. */
function toWhy(value: unknown): string | null {
  if (value === null || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const candidate = record["why"] ?? record["reason"] ?? record["rationale"];
  return typeof candidate === "string" ? candidate : null;
}

/** تکمیل اقدام‌های پیشنهادی بینش با نظر LLM (از طریق endpoint Advisor موجود). */
export function InsightLlmAdvice({ insight }: InsightLlmAdviceProps) {
  const [adviceState, setAdviceState] = useState<AdviceState>({ status: "idle" });

  const buildQuestion = (): string => {
    const driversText = insight.drivers
      .slice(0, 3)
      .map(
        (driver) =>
          `${DRIVER_LABELS[driver.factor] ?? driver.factor}=${driver.value}` +
          `(${driver.contribution > 0 ? "+" : ""}${(driver.contribution * 100).toFixed(1)}pp)`,
      )
      .join(" ");
    const impactText =
      insight.financialImpact !== undefined && insight.financialImpact.amount > 0
        ? `impact=${insight.financialImpact.amount.toLocaleString("fa-IR")} IRR`
        : "impact=none(improvement)";
    const question = (
      `You are a merchant payment advisor. Evidence: "${insight.summary}" ` +
      `rate ${(insight.metric.baseline * 100).toFixed(1)}% -> ${(insight.metric.current * 100).toFixed(1)}%; ` +
      `drivers: ${driversText || "none"}; ${impactText}. ` +
      `Give 3 concrete, merchant-specific actions (e.g. reroute terminal T59 to PSP-02), each with why and risk. ` +
      `Reply JSON: {answer, key_findings, next_actions:[{action, why}], caveats}.`
    );
    // backend سؤال را حداکثر ۱۰۰۰ کاراکتر می‌پذیرد.
    return question.slice(0, 900);
  };

  const fetchAdvice = useCallback(async () => {
    setAdviceState({ status: "loading" });
    try {
      const advisor = await getAdvisor(
        insight.merchantKey,
        insight.period.dateFrom.slice(0, 10),
        insight.period.dateTo.slice(0, 10),
        buildQuestion(),
      );
      if (advisor.advisor_narrative === null) {
        setAdviceState({
          status: "error",
          message: "مدل زبانی پاسخ نداد (fallback قطعی استفاده شد). VPN را بررسی کنید یا دوباره تلاش کنید.",
        });
        return;
      }
      setAdviceState({ status: "ready", narrative: advisor.advisor_narrative, source: advisor.narrative_source });
    } catch (error) {
      setAdviceState({ status: "error", message: error instanceof Error ? error.message : "خطای ناشناخته" });
    }
  }, [insight]);

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles aria-hidden="true" className="size-4 text-primary" />
          تکمیل اقدام‌ها با نظر LLM
        </p>
        <Button variant="outline" onClick={() => void fetchAdvice()} disabled={adviceState.status === "loading"}>
          {adviceState.status === "loading" ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              در حال دریافت نظر LLM...
            </>
          ) : (
            "دریافت نظر LLM"
          )}
        </Button>
      </div>

      {adviceState.status === "error" && (
        <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs leading-5 text-destructive">
          {adviceState.message}
        </p>
      )}

      {adviceState.status === "ready" && (
        <div className="mt-3 flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {adviceState.source === "llm" ? "تولیدشده با مدل زبانی" : "تحلیل قطعی"}
            </Badge>
          </div>
          {adviceState.narrative.answer !== undefined && (
            <p className="text-sm leading-7">{adviceState.narrative.answer}</p>
          )}
          {adviceState.narrative.next_actions !== undefined &&
            adviceState.narrative.next_actions.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium">اقدام‌های پیشنهادی LLM</p>
                <ul className="flex flex-col gap-2 text-sm leading-6">
                  {adviceState.narrative.next_actions.map((action, index) => (
                    <li key={toKey(action, index)} className="flex gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary tabular-nums">
                        {index + 1}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <span>{toDisplay(action)}</span>
                        {toWhy(action) !== null && (
                          <span className="text-xs text-muted-foreground">{toWhy(action)}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          {adviceState.narrative.caveats !== undefined && adviceState.narrative.caveats.length > 0 && (
            <div className="rounded-lg border border-dashed border-border p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">نکات احتیاطی</p>
              <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                {adviceState.narrative.caveats.map((caveat, index) => (
                  <li key={toKey(caveat, index)}>• {toDisplay(caveat)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}