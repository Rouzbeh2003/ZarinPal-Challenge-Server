import { useCallback, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import type { AdvisorNarrative, AdvisorResponse, Insight } from "@/api/types";
import { streamAdvisor } from "@/api/adapter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type InsightLlmAdviceProps = {
  insight: Insight;
};

type AdviceState =
  | { status: "idle" }
  | { status: "loading"; preview: string }
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
      record["action"] ?? record["need"] ?? record["why"] ?? record["reason"] ?? record["title"] ?? record["text"] ?? record["content"];
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
      `به‌عنوان مشاور جامع پذیرنده، فقط روی موفقیت پرداخت تمرکز نکن. Evidence: "${insight.summary}" ` +
      `rate ${(insight.metric.baseline * 100).toFixed(1)}% -> ${(insight.metric.current * 100).toFixed(1)}%; ` +
      `drivers: ${driversText || "none"}; ${impactText}. ` +
      `نیازهای آینده پذیرنده، فرصت رشد، تجربه مشتری، عملیات و ریسک را با شواهد موجود تحلیل کن. ` +
      `اقدام‌های قابل سنجش با KPI و guardrail بده؛ نیازهای فاقد داده را فرضیه بنام.`
    );
    // backend سؤال را حداکثر ۱۰۰۰ کاراکتر می‌پذیرد.
    return question.slice(0, 900);
  };

  const fetchAdvice = useCallback(async () => {
    setAdviceState({ status: "loading", preview: "" });
    try {
      let streamedContent = "";
      const advisor = await streamAdvisor(
        insight.merchantKey,
        insight.period.dateFrom.slice(0, 10),
        insight.period.dateTo.slice(0, 10),
        buildQuestion(),
        (delta) => {
          streamedContent += delta;
          setAdviceState({ status: "loading", preview: extractStreamingAnswer(streamedContent) });
        },
      );
      if (advisor.narrative === null) {
        setAdviceState({
          status: "error",
          message: "مدل زبانی پاسخ نداد (fallback قطعی استفاده شد). VPN را بررسی کنید یا دوباره تلاش کنید.",
        });
        return;
      }
      setAdviceState({ status: "ready", narrative: advisor.narrative, source: advisor.source });
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

      {adviceState.status === "loading" && adviceState.preview && (
        <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm leading-7">
          {adviceState.preview}
          <span className="mr-1 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" />
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
          {adviceState.narrative.predicted_needs !== undefined && adviceState.narrative.predicted_needs.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium">نیازهای پیش‌بینی‌شده پذیرنده</p>
              <ul className="flex flex-col gap-2 text-sm leading-6">
                {adviceState.narrative.predicted_needs.map((need, index) => (
                  <li key={toKey(need, index)} className="rounded-lg border border-border p-3">{toDisplay(need)}</li>
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

/** متن فیلد answer را حتی پیش از کامل‌شدن JSON مدل برای نمایش زنده استخراج می‌کند. */
function extractStreamingAnswer(content: string): string {
  const marker = '"answer"';
  const markerIndex = content.indexOf(marker);
  if (markerIndex < 0) return "";
  const colonIndex = content.indexOf(":", markerIndex + marker.length);
  const quoteIndex = content.indexOf('"', colonIndex + 1);
  if (colonIndex < 0 || quoteIndex < 0) return "";
  let result = "";
  let escaped = false;
  for (const character of content.slice(quoteIndex + 1)) {
    if (escaped) {
      result += character === "n" ? "\n" : character;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (character === '"') {
      break;
    } else {
      result += character;
    }
  }
  return result;
}
