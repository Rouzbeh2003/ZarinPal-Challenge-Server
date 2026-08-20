/**
 * قراردادهای داده‌ای فرانت‌اند.
 *
 * این فایل تنها مرجع قراردادهای نوع‌داده در فرانت است. شکل آن با
 * BACKEND_IMPLEMENTATION_SPEC.md هماهنگ شده تا لایه adapter بتواند
 * بعداً بدون تغییر صفحات، با API واقعی جایگزین شود.
 *
 * قواعد (طبق سند Backend):
 * - درصدها همیشه عدد بین صفر و یک هستند (۰.۶۴ = ۶۴٪).
 * - مبلغ‌ها integer هستند و currency جداگانه نگه‌داری می‌شود.
 * - severity و statusها از نوع union محدود هستند (نه string آزاد).
 * - هیچ response‌ای نباید داده حساس (مانند کامل payer_card_key) داشته باشد.
 */

/** پاکت استاندارد خطای API (طبق سند، بخش 14). */
export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
};

export type IsoDate = string; // ISO-8601
export type Currency = "IRR";

/** بازه زمانی درخواستی؛ تاریخ‌ها ISO-8601 با timezone. */
export type DateRange = {
  dateFrom: IsoDate;
  dateTo: IsoDate;
  timezone: string; // پیش‌فرض: "Asia/Tehran"
};

export type MerchantStatus = "active" | "pending" | "suspended";

/** پذیرنده؛ شناسه‌ها در سطح merchant از API دریافت می‌شوند. */
export type Merchant = {
  merchantKey: string;
  title: string;
  categoryTitle: string;
  status: MerchantStatus;
};

/** یک معیار KPI با تعریف نسخه‌دار (طبق «فرهنگ معیارها»). */
export type KpiMetric = {
  name: string;
  definitionVersion: string;
  value: number; // درصد: بین ۰ و ۱
  baseline?: number;
  absoluteChange?: number;
  relativeChange?: number;
  unit: "percent" | "amount" | "count";
  currency?: Currency; // فقط برای unit=amount
  isMock?: boolean;
};

/** یک مرحله از قیف پرداخت (سطح session). */
export type FunnelStage = {
  stageKey: string;
  label: string;
  count: number; // تعداد session در این مرحله
  amount: number; // مجموع مبلغ (یک‌بار شمرده‌شده)
  currency: Currency;
};

/** یک ردیف تفکیکی تحلیل تلاش مجدد (بر اساس PSP/بانک/کد پاسخ). */
export type RetryBreakdownRow = {
  pspKey: string;
  pspTitle: string;
  issuerBankCode?: string;
  switchResponseCode?: string;
  sessionCount: number;
  retriedSessionCount: number;
  recoveredSessionCount: number;
  recoveredAmount: number;
  currency: Currency;
  recoveryRate?: number; // ۰ تا ۱
};

/** تحلیل تلاش مجدد (Task 7). */
export type RetryAnalysis = {
  retryRate: KpiMetric; // سشن‌های با بیش از یک تلاش / سشن‌های دارای تلاش واقعی
  recoveryRate: KpiMetric; // سشن‌های ناموفقِ بازیابی‌شده / سشن‌های retry
  recoveredAmount: number;
  currency: Currency;
  atRiskAmount: number; // «در معرض از دست رفتن» — نه زیان قطعی
  breakdown: RetryBreakdownRow[];
};

/** یک بینش (طبق قرارداد استاندارد سند، بخش 12). */
export type InsightSeverity = "low" | "medium" | "high" | "critical";

export type InsightMetric = {
  name: string;
  current: number;
  baseline: number;
  absoluteChange: number;
  relativeChange: number;
};

export type FinancialImpact = {
  amount: number;
  currency: Currency;
  method: string; // توضیح روش تخمین
};

export type InsightPeriod = {
  dateFrom: IsoDate;
  dateTo: IsoDate;
};

export type InsightDriver = {
  factor: string; // e.g. "psp"
  value: string;
  contribution: number; // سهم در تغییر (۰ تا ۱)
  evidenceCount: number;
};

export type RecommendedAction = {
  title: string;
  description: string;
};

export type Insight = {
  id: string;
  merchantKey: string;
  type: string; // e.g. "payment_success_drop"
  severity: InsightSeverity;
  title: string;
  summary: string;
  metric: InsightMetric;
  financialImpact?: FinancialImpact;
  drivers: InsightDriver[];
  recommendedActions: RecommendedAction[];
  confidence: number;
  coverage: number;
  period: InsightPeriod;
  baselinePeriod: InsightPeriod;
  traceId: string;
  generatedAt: IsoDate;
};

/** قرارداد ردیابی (trace) — هر عدد باید قابل ردیابی باشد. */
export type TraceFilter = {
  key: string;
  label: string;
  value: string;
};

export type TraceEvidence = {
  sessionKey: string;
  trySeq: number;
  merchantKey: string;
  amount: number;
  currency: Currency;
  status: string;
  pspCode?: string;
  issuerBankCode?: string;
  verifiedAt?: IsoDate;
  included: boolean; // آیا این رکورد در محاسبه لحاظ شده؟
  exclusionReason?: string; // اگر included=false
};

export type Trace = {
  metricName: string;
  definitionVersion: string;
  calculationLevel: "attempt" | "session";
  datasetVersion: string;
  ingestionRunId: string;
  merchantKey: string;
  period: DateRange;
  filters: TraceFilter[];
  numerator: string;
  denominator: string;
  inputRecordCount: number;
  outputRecordCount: number;
  excludedRecordCount: number;
  exclusionReasons: string[];
  dataCoverage: number; // ۰ تا ۱
  baselineDefinition: string;
  breakdownContribution: InsightDriver[];
  queryTemplateId: string;
  queryParameters: Record<string, string>;
  generatedAt: IsoDate;
  evidence: TraceEvidence[];
  formulas: string[];
};

/** پاسخ overview (Task 5). */
export type Overview = {
  merchantKey: string;
  period: DateRange;
  kpis: KpiMetric[];
  recentInsights: Insight[];
  trend: Array<{
    date: IsoDate;
    successRate: number;
    successfulAmount: number;
    currency: Currency;
  }>;
};

/** پاسخ Advisor (LLM + تحلیل چندبعدی). */
export type AdvisorDimensionRow = {
  value: string;
  valid_sessions: number;
  successful_sessions: number;
  successful_amount: number;
  potential_lost_amount: number;
  success_rate: number;
};

export type AdvisorDimensions = {
  amount_buckets: AdvisorDimensionRow[];
  hours: AdvisorDimensionRow[];
  weekdays: AdvisorDimensionRow[];
  psps: AdvisorDimensionRow[];
  issuer_banks: AdvisorDimensionRow[];
  terminals: AdvisorDimensionRow[];
  switch_responses: AdvisorDimensionRow[];
  verify_types: AdvisorDimensionRow[];
};

export type AdvisorRecommendation = {
  code: string;
  priority: "high" | "medium" | "low";
  title: string;
  rationale: string;
  expected_signal: string;
  guardrail: string;
};

export type AdvisorNarrative = {
  answer?: string;
  key_findings?: unknown[];
  next_actions?: unknown[];
  caveats?: unknown[];
};

export type AdvisorResponse = {
  merchant_key: string;
  period: { date_from: string; date_to: string };
  executive_summary: string[];
  overview: Record<string, unknown>;
  dimensions: AdvisorDimensions;
  retry: Record<string, unknown>;
  recommendations: AdvisorRecommendation[];
  advisor_narrative: AdvisorNarrative | null;
  narrative_source: "llm" | "deterministic_engine" | "deterministic_engine_fallback";
  methodology: Record<string, string>;
};

/** پاسخ payment-health (Task 6). */
export type PaymentHealth = {
  merchantKey: string;
  period: DateRange;
  successRate: KpiMetric;
  pspBreakdown: Array<{
    pspKey: string;
    pspTitle: string;
    sessionCount: number;
    successRate: number;
    status: "ok" | "attention" | "critical";
    atRiskAmount: number; // مبلغ در معرض ازدست‌رفتن این PSP (بالقوه)
  }>;
  funnel: FunnelStage[];
  atRiskAmount: number;
  currency: Currency;
};