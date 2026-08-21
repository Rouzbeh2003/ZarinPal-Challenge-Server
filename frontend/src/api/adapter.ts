/**
 * لایه آداپتر داده — نسخه واقعی (متصل به Backend Django با JWT).
 *
 * صفحات فقط از این فایل داده می‌گیرند؛ شکل خروجی (`api/types.ts`) برای صفحات
 * ثابت می‌ماند و این فایل پاسخ‌های Snake_case واقعی API را به آن شکل نگاشت
 * می‌کند. پارامترها مستقیم به query-string تبدیل می‌شوند.
 *
 * احراز هویت: JWT Bearer (از `auth.tsx` تنظیم می‌شود). همه درخواست‌ها با
 * هدر Authorization ارسال می‌شوند و از proxy Vite استفاده می‌کنیم.
 */

import type {
  AdvisorResponse,
  Currency,
  FunnelStage,
  Insight,
  KpiMetric,
  Merchant,
  Overview,
  PaymentHealth,
  RetryAnalysis,
  Trace,
  TraceEvidence,
} from "@/api/types";

function toCurrency(_value: string): Currency {
  // Backend همیشه IRR برمی‌گرداند؛ اگر ارز دیگری آمد، همین‌جا قابل تمدید است.
  return "IRR";
}

function translateImpactMethod(method: string): string {
  if (method.includes("potential impact") || method.includes("Estimated missing")) {
    return "تخمین سشن‌های موفق ازدست‌رفته با نرخ پایه ضرب در میانگین مبلغ سشن موفق فعلی؛ اثر بالقوه است، نه زیان قطعی.";
  }
  return method;
}

function translateMetricDefinition(definition: string): string {
  if (definition.includes("Successful valid sessions divided by all valid sessions")) {
    return "سشن‌های موفقِ معتبر تقسیم بر همه سشن‌های معتبر. وضعیت‌های «تأییدشده» و «پرداخت‌شده» موفق فرض می‌شوند؛ سشن‌های برگشتی از فروش خارج می‌شوند.";
  }
  return definition;
}

export type QueryParams = {
  merchantKey?: string;
  dateFrom?: string;
  dateTo?: string;
};

const API_BASE = "/api/v1";

// توکن‌های JWT (از auth.tsx تنظیم می‌شوند).
let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (token) sessionStorage.setItem("dashboard_access_token", token);
  else sessionStorage.removeItem("dashboard_access_token");
}

export function setRefreshToken(token: string | null): void {
  refreshToken = token;
  if (token) sessionStorage.setItem("dashboard_refresh_token", token);
  else sessionStorage.removeItem("dashboard_refresh_token");
}

/** نشست ذخیره‌شده در همین تب را برای بازیابی بعد از refresh فعال می‌کند. */
export function restoreStoredTokens(): boolean {
  const storedAccess = sessionStorage.getItem("dashboard_access_token");
  const storedRefresh = sessionStorage.getItem("dashboard_refresh_token");
  if (!storedAccess || !storedRefresh) return false;
  accessToken = storedAccess;
  refreshToken = storedRefresh;
  return true;
}

export async function getAuthSession(): Promise<{ username: string; is_superuser: boolean }> {
  return requestJson<{ username: string; is_superuser: boolean }>("/auth/session");
}

export async function updateAccount(payload: {
  currentPassword: string;
  username: string;
  newPassword?: string;
}): Promise<{ username: string; is_superuser: boolean }> {
  return requestJson<{ username: string; is_superuser: boolean }>("/auth/account", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_password: payload.currentPassword,
      username: payload.username,
      new_password: payload.newPassword || null,
    }),
  });
}

/** رفرش توکن access با استفاده از refresh_token؛ در صورت موفقیت توکن جدید تنظیم می‌شود. */
async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      credentials: "include",
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { access_token?: string; refresh_token?: string };
    if (body.access_token) setAccessToken(body.access_token);
    if (body.refresh_token) setRefreshToken(body.refresh_token);
    return true;
  } catch {
    return false;
  }
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const doFetch = (): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include" });
  };

  let response = await doFetch();

  // اگر توکن access منقضی شده بود، یک‌بار رفرش و درخواست را تکرار کن.
  if (response.status === 401 && (await refreshAccessToken())) {
    response = await doFetch();
  }

  if (!response.ok) {
    let message = `خطای سرویس (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // پاسخ JSON نبود؛ پیام پیش‌فرض کافی است.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

function buildMetricQuery(params: QueryParams): string {
  const search = new URLSearchParams();
  if (params.dateFrom) search.set("date_from", params.dateFrom);
  if (params.dateTo) search.set("date_to", params.dateTo);
  search.set("timezone", "Asia/Tehran");
  const query = search.toString();
  return query ? `?${query}` : "";
}

// ---------------------------------------------------------------------------
// Merchant
// ---------------------------------------------------------------------------

type RawMerchant = {
  merchant_key: string;
  category_id: string;
  category_title: string;
};

export type MerchantCredential = {
  merchant_key: string;
  category_title: string;
  username: string;
  password: string;
};

export async function getMerchantCredentials(): Promise<MerchantCredential[]> {
  const data = await requestJson<{ items: MerchantCredential[] }>("/admin/merchant-credentials");
  return data.items;
}

type RawMerchantList = {
  items: RawMerchant[];
  page: number;
  page_size: number;
  total: number;
};

function mapMerchant(item: RawMerchant): Merchant {
  return {
    merchantKey: item.merchant_key,
    title: item.category_title || item.merchant_key,
    categoryTitle: item.category_title,
    status: "active",
  };
}

export async function getMerchants(): Promise<Merchant[]> {
  // backend صفحه‌بندی دارد (حداکثر 100 در هر صفحه)؛ همه مرچنت‌ها را با چند صفحه
  // می‌گیریم تا لیست کامل در اختیار فرانت باشد (انتخاب پذیرنده کامل و صحیح).
  const all: Merchant[] = [];
  const pageSize = 100;
  let page = 1;
  for (;;) {
    const data = await requestJson<RawMerchantList>(`/merchants?page=${page}&page_size=${pageSize}`);
    all.push(...data.items.map(mapMerchant));
    if (all.length >= data.total || data.items.length === 0) break;
    page += 1;
  }
  return all;
}

// ---------------------------------------------------------------------------
// Overview (شامل daily_trend و psp_breakdown واقعی)
// ---------------------------------------------------------------------------

type RawTrendPoint = {
  date: string;
  valid_sessions: number;
  successful_sessions: number;
  successful_amount: number;
  success_rate: number | null;
};

type RawPspBreakdown = {
  psp_code: string;
  session_count: number;
  successful_sessions: number;
  success_rate: number | null;
  potential_lost_amount: number;
};

type RawOverview = {
  valid_sessions: number;
  successful_sessions: number;
  successful_amount: number;
  potential_lost_amount: number;
  no_attempt_sessions: number;
  success_rate: number | null;
  no_attempt_rate: number | null;
  currency: string;
  metric_version: string;
  daily_trend: RawTrendPoint[];
  psp_breakdown: RawPspBreakdown[];
};

function kpiPercent(name: string, value: number | null, version: string): KpiMetric {
  return {
    name,
    definitionVersion: version,
    value: value ?? 0,
    unit: "percent",
  };
}

export async function getOverview(params: QueryParams = {}): Promise<Overview> {
  const query = buildMetricQuery(params);
  const merchantKey = params.merchantKey ?? "M250";
  const data = await requestJson<RawOverview>(`/merchants/${merchantKey}/overview${query}`);

  const kpis: KpiMetric[] = [
    {
      name: "valid_sessions",
      definitionVersion: data.metric_version,
      value: data.valid_sessions,
      unit: "count",
    },
    {
      name: "successful_amount",
      definitionVersion: data.metric_version,
      value: data.successful_amount,
      unit: "amount",
      currency: toCurrency(data.currency),
    },
    kpiPercent("success_rate", data.success_rate, data.metric_version),
    {
      name: "potential_lost_amount",
      definitionVersion: data.metric_version,
      value: data.potential_lost_amount,
      unit: "amount",
      currency: toCurrency(data.currency),
    },
  ];

  return {
    merchantKey,
    period: {
      dateFrom: params.dateFrom ?? "",
      dateTo: params.dateTo ?? "",
      timezone: "Asia/Tehran",
    },
    kpis,
    trend: data.daily_trend.map((point) => ({
      date: point.date,
      successRate: point.success_rate ?? 0,
      successfulAmount: point.successful_amount,
      currency: toCurrency(data.currency),
    })),
    recentInsights: [],
  };
}

// ---------------------------------------------------------------------------
// Payment Health و Funnel
// ---------------------------------------------------------------------------

type RawFunnel = {
  created_sessions: number;
  attempted_sessions: number;
  bank_entry_sessions: number;
  successful_sessions: number;
};

function toFunnelStages(data: RawFunnel): FunnelStage[] {
  return [
    { stageKey: "created", label: "شروع پرداخت", count: data.created_sessions, amount: 0, currency: "IRR" },
    { stageKey: "attempted", label: "تلاش واقعی", count: data.attempted_sessions, amount: 0, currency: "IRR" },
    { stageKey: "bank_entry", label: "انتقال به بانک", count: data.bank_entry_sessions, amount: 0, currency: "IRR" },
    { stageKey: "successful", label: "تأیید شده", count: data.successful_sessions, amount: 0, currency: "IRR" },
  ];
}

export async function getPaymentHealth(params: QueryParams = {}): Promise<PaymentHealth> {
  const query = buildMetricQuery(params);
  const merchantKey = params.merchantKey ?? "M250";
  const [overviewData, funnelData] = await Promise.all([
    requestJson<RawOverview>(`/merchants/${merchantKey}/overview${query}`),
    requestJson<RawFunnel>(`/merchants/${merchantKey}/funnel${query}`),
  ]);

  return {
    merchantKey,
    period: {
      dateFrom: params.dateFrom ?? "",
      dateTo: params.dateTo ?? "",
      timezone: "Asia/Tehran",
    },
    successRate: kpiPercent("success_rate", overviewData.success_rate, overviewData.metric_version),
    pspBreakdown: overviewData.psp_breakdown.map((psp) => ({
      pspKey: psp.psp_code,
      pspTitle: psp.psp_code,
      sessionCount: psp.session_count,
      successRate: psp.success_rate ?? 0,
      status:
        psp.success_rate === null || psp.success_rate >= 0.7
          ? "ok"
          : psp.success_rate >= 0.5
            ? "attention"
            : "critical",
      atRiskAmount: psp.potential_lost_amount,
    })),
    funnel: toFunnelStages(funnelData),
    atRiskAmount: overviewData.potential_lost_amount,
    currency: toCurrency(overviewData.currency),
  };
}

export async function getFunnel(params: QueryParams = {}): Promise<PaymentHealth["funnel"]> {
  const query = buildMetricQuery(params);
  const merchantKey = params.merchantKey ?? "M250";
  const data = await requestJson<RawFunnel>(`/merchants/${merchantKey}/funnel${query}`);
  return toFunnelStages(data);
}

// ---------------------------------------------------------------------------
// Retry
// ---------------------------------------------------------------------------

type RawRetryRow = {
  psp_code: string;
  issuer_bank_code: string;
  session_count: number;
  retried_sessions: number;
  recovered_sessions: number;
  recovered_amount: number;
  recovery_rate: number | null;
};

type RawRetry = {
  sessions_with_attempt: number;
  retried_sessions: number;
  recovered_sessions: number;
  recovered_amount: number;
  retry_rate: number | null;
  retry_recovery_rate: number | null;
  currency: string;
  metric_version: string;
  breakdown: RawRetryRow[];
};

export async function getRetryAnalysis(params: QueryParams = {}): Promise<RetryAnalysis> {
  const query = buildMetricQuery(params);
  const merchantKey = params.merchantKey ?? "M250";
  const data = await requestJson<RawRetry>(`/merchants/${merchantKey}/retry-analysis${query}`);

  return {
    retryRate: kpiPercent("retry_rate", data.retry_rate, data.metric_version),
    recoveryRate: kpiPercent("retry_recovery_rate", data.retry_recovery_rate, data.metric_version),
    recoveredAmount: data.recovered_amount,
    currency: toCurrency(data.currency),
    atRiskAmount: 0,
    breakdown: data.breakdown.map((row) => ({
      pspKey: row.psp_code,
      pspTitle: row.psp_code,
      issuerBankCode: row.issuer_bank_code,
      sessionCount: row.session_count,
      retriedSessionCount: row.retried_sessions,
      recoveredSessionCount: row.recovered_sessions,
      recoveredAmount: row.recovered_amount,
      currency: toCurrency(data.currency),
      recoveryRate: row.recovery_rate ?? undefined,
    })),
  };
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

type RawInsightMetric = {
  name: string;
  current: number;
  baseline: number;
  absolute_change: number;
  relative_change: number | null;
};

type RawInsight = {
  id: string;
  merchant_id: string;
  type: string;
  severity: string;
  title: string;
  summary: string;
  metric: RawInsightMetric;
  financial_impact: { amount: number; currency: string; method: string };
  drivers: Array<{
    dimension: string;
    value: string;
    current_rate: number;
    baseline_rate: number;
    absolute_change: number;
    current_sessions: number;
    contribution_score: number;
    claim: string;
  }>;
  recommended_actions: Array<{ action: string; reason: string; target_metric?: string; target_value?: number; horizon_days?: number; potential_financial_impact?: number; impact_is_additive?: boolean; impact_scope?: string }>;
  confidence: number;
  coverage: number;
  coverage_details?: { input_records: number; excluded_records: number; metric_analyzed_records: number; metric_null_records: number; metric_coverage: number; adjusted_analyzed_records: number; adjusted_null_records: number; adjusted_coverage: number };
  adjusted_analysis?: { method: string; raw_effect: number | null; adjusted_effect: number | null; current_adjusted_rate: number | null; baseline_adjusted_rate: number | null; common_support_coverage: number; strata_count: number };
  action_plan?: { potential_financial_impact: number; impact_is_additive: boolean; note: string };
  period: { date_from: string; date_to: string };
  baseline_period: { date_from: string; date_to: string; method?: string };
  trace_id: string;
  generated_at: string;
};

type RawInsightList = {
  items: RawInsight[];
  page: number;
  page_size: number;
  total: number;
};

function mapInsight(raw: RawInsight): Insight {
  return {
    id: raw.id,
    merchantKey: raw.merchant_id,
    type: raw.type,
    severity: raw.severity as Insight["severity"],
    title: raw.title,
    summary: raw.summary,
    metric: {
      name: raw.metric.name,
      current: raw.metric.current,
      baseline: raw.metric.baseline,
      absoluteChange: raw.metric.absolute_change,
      relativeChange: raw.metric.relative_change ?? 0,
    },
    financialImpact: {
      amount: raw.financial_impact.amount,
      currency: toCurrency(raw.financial_impact.currency),
      method: translateImpactMethod(raw.financial_impact.method),
    },
    drivers: raw.drivers.map((d) => ({
      factor: d.dimension,
      value: d.value,
      contribution: d.absolute_change,
      evidenceCount: d.current_sessions,
    })),
    recommendedActions: raw.recommended_actions.map((a) => ({
      title: a.action,
      description: a.reason,
      targetMetric: a.target_metric,
      targetValue: a.target_value,
      horizonDays: a.horizon_days,
      potentialFinancialImpact: a.potential_financial_impact,
      impactIsAdditive: a.impact_is_additive,
      impactScope: a.impact_scope,
    })),
    confidence: raw.confidence,
    coverage: raw.coverage,
    coverageDetails: raw.coverage_details === undefined ? undefined : {
      inputRecords: raw.coverage_details.input_records,
      excludedRecords: raw.coverage_details.excluded_records,
      metricAnalyzedRecords: raw.coverage_details.metric_analyzed_records,
      metricNullRecords: raw.coverage_details.metric_null_records,
      metricCoverage: raw.coverage_details.metric_coverage,
      adjustedAnalyzedRecords: raw.coverage_details.adjusted_analyzed_records,
      adjustedNullRecords: raw.coverage_details.adjusted_null_records,
      adjustedCoverage: raw.coverage_details.adjusted_coverage,
    },
    adjustedAnalysis: raw.adjusted_analysis === undefined ? undefined : {
      method: raw.adjusted_analysis.method,
      rawEffect: raw.adjusted_analysis.raw_effect ?? undefined,
      adjustedEffect: raw.adjusted_analysis.adjusted_effect ?? undefined,
      currentAdjustedRate: raw.adjusted_analysis.current_adjusted_rate ?? undefined,
      baselineAdjustedRate: raw.adjusted_analysis.baseline_adjusted_rate ?? undefined,
      commonSupportCoverage: raw.adjusted_analysis.common_support_coverage,
      strataCount: raw.adjusted_analysis.strata_count,
    },
    actionPlan: raw.action_plan === undefined ? undefined : {
      potentialFinancialImpact: raw.action_plan.potential_financial_impact,
      impactIsAdditive: raw.action_plan.impact_is_additive,
      note: raw.action_plan.note,
    },
    period: { dateFrom: raw.period.date_from, dateTo: raw.period.date_to },
    baselinePeriod: { dateFrom: raw.baseline_period.date_from, dateTo: raw.baseline_period.date_to },
    traceId: raw.trace_id,
    generatedAt: raw.generated_at,
  };
}

export async function getInsights(params: QueryParams = {}): Promise<Insight[]> {
  const merchantKey = params.merchantKey ?? "M250";
  const data = await requestJson<RawInsightList>(`/merchants/${merchantKey}/insights?page_size=50`);
  return data.items.map(mapInsight);
}

export async function getInsightDetail(insightId: string): Promise<Insight> {
  const data = await requestJson<RawInsight>(`/insights/${insightId}`);
  return mapInsight(data);
}

// ---------------------------------------------------------------------------
// Advisor (تحلیل چندبعدی + روایت LLM)
// ---------------------------------------------------------------------------

export async function getAdvisor(
  merchantKey: string,
  dateFrom: string,
  dateTo: string,
  question: string,
): Promise<AdvisorResponse> {
  const body = JSON.stringify({
    date_from: dateFrom,
    date_to: dateTo,
    timezone: "Asia/Tehran",
    question,
  });
  return requestJson<AdvisorResponse>(`/merchants/${merchantKey}/advisor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

// ---------------------------------------------------------------------------
// Trace و Evidence
// ---------------------------------------------------------------------------

type RawTraceResponse = {
  trace_id: string;
  insight_id: string;
  trace: {
    metric_name: string;
    metric_definition_version: string;
    metric_definition: string;
    grain: string;
    dataset_version: string;
    ingestion_run_id: string | null;
    merchant_key: string;
    period: { date_from: string; date_to: string };
    baseline: { definition: string; date_from: string; date_to: string };
    filters: Record<string, string | null>;
    current_calculation: { numerator: number; denominator: number; input_records: number; excluded_records: number };
    missing_data_coverage: number;
    breakdowns: Array<{
      dimension: string;
      value: string;
      current_rate: number;
      baseline_rate: number;
      absolute_change: number;
      current_sessions: number;
      contribution_score: number;
    }>;
    calculation_id: string;
    query_parameters: Record<string, string>;
    policy: Record<string, unknown>;
  };
  generated_at: string;
};

type RawEvidence = {
  items: Array<{
    session_key: string;
    metric_date: string;
    amount: number;
    final_status: string;
    attempts_count: number;
    final_psp_code: string | null;
    final_issuer_bank_code: string | null;
    payer_card_masked: string | null;
  }>;
  page: number;
  page_size: number;
  total: number;
};

function mapTrace(raw: RawTraceResponse): Trace {
  const trace = raw.trace;
  return {
    metricName: trace.metric_name,
    definitionVersion: trace.metric_definition_version,
    calculationLevel: trace.grain === "session" ? "session" : "attempt",
    datasetVersion: trace.dataset_version,
    ingestionRunId: trace.ingestion_run_id ?? "",
    merchantKey: trace.merchant_key,
    period: {
      dateFrom: trace.period.date_from,
      dateTo: trace.period.date_to,
      timezone: "Asia/Tehran",
    },
    filters: Object.entries(trace.filters)
      .filter(([, value]) => value !== null)
      .map(([key, value]) => ({ key, label: key, value: value ?? "" })),
    numerator: String(trace.current_calculation.numerator),
    denominator: String(trace.current_calculation.denominator),
    inputRecordCount: trace.current_calculation.input_records,
    outputRecordCount: trace.current_calculation.denominator,
    excludedRecordCount: trace.current_calculation.excluded_records,
    exclusionReasons: [],
    dataCoverage: trace.missing_data_coverage,
    baselineDefinition: trace.baseline.definition,
    breakdownContribution: trace.breakdowns.map((b) => ({
      factor: b.dimension,
      value: b.value,
      contribution: b.absolute_change,
      evidenceCount: b.current_sessions,
    })),
    queryTemplateId: trace.calculation_id,
    queryParameters: trace.query_parameters,
    generatedAt: raw.generated_at,
    evidence: [],
    formulas: [translateMetricDefinition(trace.metric_definition)],
  };
}

export async function getInsightTrace(insightId: string): Promise<Trace> {
  const data = await requestJson<RawTraceResponse>(`/insights/${insightId}/trace`);
  const trace = mapTrace(data);
  const evidence = await requestJson<RawEvidence>(`/insights/${insightId}/evidence?page_size=50`);
  trace.evidence = evidence.items.map((row): TraceEvidence => ({
    sessionKey: row.session_key,
    trySeq: row.attempts_count,
    merchantKey: trace.merchantKey,
    amount: row.amount,
    currency: "IRR",
    status: row.final_status,
    pspCode: row.final_psp_code ?? undefined,
    issuerBankCode: row.final_issuer_bank_code ?? undefined,
    verifiedAt: undefined,
    included: true,
  }));
  return trace;
}

export async function getTrace(_params: QueryParams = {}): Promise<Trace> {
  // مسیر عمومی trace در API وجود ندارد؛ trace همیشه به یک insight وابسته است.
  throw new Error("Trace عمومی بدون insight در دسترس نیست؛ از مسیر بینش استفاده کنید.");
}

export async function streamAdvisor(
  merchantKey: string,
  dateFrom: string,
  dateTo: string,
  question: string,
  onDelta: (content: string) => void,
): Promise<{ narrative: AdvisorResponse["advisor_narrative"]; source: AdvisorResponse["narrative_source"]; advisor?: AdvisorResponse }> {
  const doFetch = (): Promise<Response> => fetch(`${API_BASE}/merchants/${merchantKey}/advisor/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ date_from: dateFrom, date_to: dateTo, timezone: "Asia/Tehran", question }),
  });
  let response = await doFetch();
  if (response.status === 401 && (await refreshAccessToken())) response = await doFetch();
  if (!response.ok || !response.body) throw new Error(`خطای سرویس (${response.status})`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as { type: string; content?: string; message?: string; narrative?: AdvisorResponse["advisor_narrative"]; source?: AdvisorResponse["narrative_source"]; advisor?: AdvisorResponse };
      if (event.type === "delta" && event.content) onDelta(event.content);
      if (event.type === "error") throw new Error(event.message ?? "پاسخ مدل زبانی نامعتبر است");
      if (event.type === "complete") return { narrative: event.narrative ?? null, source: event.source ?? "llm", advisor: event.advisor };
    }
    if (done) break;
  }
  throw new Error("جریان پاسخ پیش از تکمیل قطع شد");
}

export async function getAdvisorEvidence(
  merchantKey: string,
  dateFrom: string,
  dateTo: string,
  page: number,
  pageSize = 10,
): Promise<NonNullable<AdvisorResponse["transaction_evidence"]>> {
  const query = new URLSearchParams({
    date_from: dateFrom,
    date_to: dateTo,
    timezone: "Asia/Tehran",
    page: String(page),
    page_size: String(pageSize),
  });
  return requestJson<NonNullable<AdvisorResponse["transaction_evidence"]>>(
    `/merchants/${merchantKey}/advisor/evidence?${query.toString()}`,
  );
}
