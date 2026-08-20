/**
 * فیکسچر بینش‌ها و trace.
 *
 * ⚠️ داده «نمایشی» برای طراحی رابط است؛ اعداد واقعی نیستند.
 */

import type { Insight, Trace } from "@/api/types";

export const mockInsights: Insight[] = [
  {
    id: "ins_001",
    merchantKey: "m_online_shop",
    type: "payment_success_drop",
    severity: "high",
    title: "افت نرخ موفقیت در ساعات پایانی شب",
    summary:
      "نرخ موفقیت در بازه ۲۳:۰۰ تا ۰۱:۰۰ نسبت به دوره قبل حدود ۶ واحد درصد کاهش یافته است. این افت عمدتاً هم‌زمان با افزایش خطاهای PSP-02 و PSP-07 بوده است.",
    metric: {
      name: "success_rate",
      current: 0.641,
      baseline: 0.702,
      absoluteChange: -0.061,
      relativeChange: -0.087,
    },
    financialImpact: {
      amount: 187_000_000,
      currency: "IRR",
      method: "مجموع مبلغ سشن‌های ناموفق در بازه کاهش، پس از کنترل میانگین مبلغ",
    },
    drivers: [
      { factor: "psp", value: "psp-02", contribution: 0.42, evidenceCount: 2140 },
      { factor: "issuer_bank", value: "bank-014", contribution: 0.21, evidenceCount: 980 },
    ],
    recommendedActions: [
      {
        title: "بررسی وضعیت PSP-02 در بازه شب",
        description: "درخواست گزارش خرابی از PSP مربوطه پیش از جابه‌جایی ترافیک.",
      },
      {
        title: "فعال‌سازی failover بین PSPها",
        description: "مسیریابی خودکار به PSP جایگزین هنگام خطای تکراری.",
      },
    ],
    confidence: 0.91,
    coverage: 0.97,
    period: { dateFrom: "2026-06-20T00:00:00+03:30", dateTo: "2026-06-26T23:59:59+03:30" },
    baselinePeriod: { dateFrom: "2026-06-06T00:00:00+03:30", dateTo: "2026-06-12T23:59:59+03:30" },
    traceId: "trc_001",
    generatedAt: "2026-06-27T06:30:00+03:30",
  },
  {
    id: "ins_002",
    merchantKey: "m_online_shop",
    type: "retry_recovery_improvement",
    severity: "medium",
    title: "افزایش مبلغ بازیابی‌شده پس از تلاش مجدد",
    summary:
      "نرخ بازیابی تلاش مجدد نسبت به هفته قبل ۴ واحد درصد رشد کرده و مبلغ بازیابی‌شده حدود ۵۲ میلیون تومان افزایش یافته است.",
    metric: {
      name: "retry_recovery_rate",
      current: 0.58,
      baseline: 0.54,
      absoluteChange: 0.04,
      relativeChange: 0.074,
    },
    financialImpact: {
      amount: 52_000_000,
      currency: "IRR",
      method: "روند مبلغ بازیابی‌شده در سشن‌های دارای تلاش مجدد",
    },
    drivers: [
      { factor: "verify_type", value: "verify", contribution: 0.6, evidenceCount: 430 },
    ],
    recommendedActions: [
      {
        title: "ادامه نمایش پیام «پرداخت در حال بررسی»",
        description: "تجربه کاربری فعلی بازخورد مثبت داشته؛ نگه‌داری آن تأیید شد.",
      },
    ],
    confidence: 0.84,
    coverage: 0.96,
    period: { dateFrom: "2026-06-20T00:00:00+03:30", dateTo: "2026-06-26T23:59:59+03:30" },
    baselinePeriod: { dateFrom: "2026-06-06T00:00:00+03:30", dateTo: "2026-06-12T23:59:59+03:30" },
    traceId: "trc_002",
    generatedAt: "2026-06-27T06:30:00+03:30",
  },
  {
    id: "ins_003",
    merchantKey: "m_online_shop",
    type: "no_attempt_rate",
    severity: "low",
    title: "افزایش سشن‌های بدون تلاش واقعی",
    summary:
      "نسبت سشن‌هایی که هیچ تلاش پرداخت واقعی نداشته‌اند از ۱۲٪ به ۱۵٪ رسیده است؛ این وضعیت عمدتاً در ترافیک موبایل مشاهده می‌شود.",
    metric: {
      name: "no_attempt_rate",
      current: 0.15,
      baseline: 0.12,
      absoluteChange: 0.03,
      relativeChange: 0.25,
    },
    drivers: [
      { factor: "terminal", value: "mobile-web", contribution: 0.7, evidenceCount: 120 },
    ],
    recommendedActions: [
      {
        title: "بازبینی صفحه پرداخت در مرورگر موبایل",
        description: "بررسی امکان راه‌اندازی مجدد درگاه هنگام خطای بارگذاری.",
      },
    ],
    confidence: 0.72,
    coverage: 0.93,
    period: { dateFrom: "2026-06-20T00:00:00+03:30", dateTo: "2026-06-26T23:59:59+03:30" },
    baselinePeriod: { dateFrom: "2026-06-06T00:00:00+03:30", dateTo: "2026-06-12T23:59:59+03:30" },
    traceId: "trc_003",
    generatedAt: "2026-06-27T06:30:00+03:30",
  },
];

export const mockTrace: Trace = {
  metricName: "success_rate",
  definitionVersion: "success_rate_v1.2",
  calculationLevel: "session",
  datasetVersion: "ds_2026_06_30",
  ingestionRunId: "ing_2026_06_30_0800",
  merchantKey: "m_online_shop",
  period: {
    dateFrom: "2026-06-20T00:00:00+03:30",
    dateTo: "2026-06-26T23:59:59+03:30",
    timezone: "Asia/Tehran",
  },
  filters: [
    { key: "status", label: "وضعیت سشن", value: "valid" },
    { key: "data_quality", label: "کیفیت داده", value: "no_duplicate" },
  ],
  numerator: "تعداد سشن‌های موفق",
  denominator: "تعداد کل سشن‌های معتبر",
  inputRecordCount: 412_000,
  outputRecordCount: 411_200,
  excludedRecordCount: 800,
  exclusionReasons: ["duplicate session_key (600)", "reversed session (200)"],
  dataCoverage: 0.971,
  baselineDefinition: "دوره قبل با طول برابر (۷ روز قبل)",
  breakdownContribution: [
    { factor: "psp", value: "psp-01", contribution: 0.3, evidenceCount: 121_000 },
    { factor: "psp", value: "psp-02", contribution: 0.42, evidenceCount: 84_000 },
  ],
  queryTemplateId: "q_success_rate_overall_v1",
  queryParameters: {
    date_from: "2026-06-20",
    date_to: "2026-06-26",
    merchant_key: "m_online_shop",
  },
  generatedAt: "2026-06-27T06:30:00+03:30",
  formulas: [
    "success_rate = successful_sessions / valid_sessions",
    "valid = not reversed and has_real_attempt",
  ],
  evidence: [
    {
      sessionKey: "sess_9f2c1",
      trySeq: 1,
      merchantKey: "m_online_shop",
      amount: 1_250_000,
      currency: "IRR",
      status: "success",
      pspCode: "psp-01",
      issuerBankCode: "bank-009",
      verifiedAt: "2026-06-21T11:02:00+03:30",
      included: true,
    },
    {
      sessionKey: "sess_3a7d9",
      trySeq: 2,
      merchantKey: "m_online_shop",
      amount: 420_000,
      currency: "IRR",
      status: "reversed",
      pspCode: "psp-02",
      issuerBankCode: "bank-014",
      included: false,
      exclusionReason: "reversed session",
    },
  ],
};