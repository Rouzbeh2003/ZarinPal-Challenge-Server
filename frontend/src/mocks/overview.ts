/**
 * فیکسچرهای Overview و Payment Health.
 *
 * ⚠️ داده «نمایشی» برای طراحی رابط است؛ اعداد واقعی نیستند.
 */

import type { Overview, PaymentHealth } from "@/api/types";

export const mockOverview: Overview = {
  merchantKey: "m_online_shop",
  period: {
    dateFrom: "2026-06-20T00:00:00+03:30",
    dateTo: "2026-06-26T23:59:59+03:30",
    timezone: "Asia/Tehran",
  },
  kpis: [
    { name: "successful_amount", definitionVersion: "amount_v1", value: 4_820_000_000, unit: "amount", currency: "IRR" },
    { name: "success_rate", definitionVersion: "success_rate_v1.2", value: 0.672, baseline: 0.698, absoluteChange: -0.026, relativeChange: -0.037, unit: "percent" },
    { name: "retry_rate", definitionVersion: "retry_v1", value: 0.24, baseline: 0.22, absoluteChange: 0.02, relativeChange: 0.091, unit: "percent" },
    { name: "at_risk_amount", definitionVersion: "amount_v1", value: 310_000_000, unit: "amount", currency: "IRR" },
  ],
  recentInsights: [
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
      financialImpact: { amount: 187_000_000, currency: "IRR", method: "مجموع مبلغ سشن‌های ناموفق در بازه کاهش" },
      drivers: [{ factor: "psp", value: "psp-02", contribution: 0.42, evidenceCount: 2140 }],
      recommendedActions: [
        { title: "بررسی وضعیت PSP-02 در بازه شب", description: "درخواست گزارش خرابی از PSP مربوطه." },
      ],
      confidence: 0.91,
      coverage: 0.97,
      period: { dateFrom: "2026-06-20T00:00:00+03:30", dateTo: "2026-06-26T23:59:59+03:30" },
      baselinePeriod: { dateFrom: "2026-06-06T00:00:00+03:30", dateTo: "2026-06-12T23:59:59+03:30" },
      traceId: "trc_001",
      generatedAt: "2026-06-27T06:30:00+03:30",
    },
  ],
  trend: [
    { date: "2026-06-20T00:00:00+03:30", successRate: 0.71, successfulAmount: 710_000_000, currency: "IRR" },
    { date: "2026-06-21T00:00:00+03:30", successRate: 0.68, successfulAmount: 690_000_000, currency: "IRR" },
    { date: "2026-06-22T00:00:00+03:30", successRate: 0.69, successfulAmount: 701_000_000, currency: "IRR" },
    { date: "2026-06-23T00:00:00+03:30", successRate: 0.67, successfulAmount: 655_000_000, currency: "IRR" },
    { date: "2026-06-24T00:00:00+03:30", successRate: 0.66, successfulAmount: 640_000_000, currency: "IRR" },
    { date: "2026-06-25T00:00:00+03:30", successRate: 0.65, successfulAmount: 632_000_000, currency: "IRR" },
    { date: "2026-06-26T00:00:00+03:30", successRate: 0.64, successfulAmount: 625_000_000, currency: "IRR" },
  ],
};

export const mockPaymentHealth: PaymentHealth = {
  merchantKey: "m_online_shop",
  period: {
    dateFrom: "2026-06-20T00:00:00+03:30",
    dateTo: "2026-06-26T23:59:59+03:30",
    timezone: "Asia/Tehran",
  },
  successRate: {
    name: "success_rate",
    definitionVersion: "success_rate_v1.2",
    value: 0.672,
    baseline: 0.698,
    absoluteChange: -0.026,
    relativeChange: -0.037,
    unit: "percent",
  },
  pspBreakdown: [
    { pspKey: "psp-01", pspTitle: "PSP یک", sessionCount: 221_000, successRate: 0.74, status: "ok", atRiskAmount: 120_000_000 },
    { pspKey: "psp-02", pspTitle: "PSP دو", sessionCount: 84_000, successRate: 0.51, status: "critical", atRiskAmount: 148_000_000 },
    { pspKey: "psp-07", pspTitle: "PSP هفت", sessionCount: 45_000, successRate: 0.62, status: "attention", atRiskAmount: 32_000_000 },
    { pspKey: "psp-03", pspTitle: "PSP سه", sessionCount: 40_000, successRate: 0.7, status: "ok", atRiskAmount: 10_000_000 },
  ],
  funnel: [
    { stageKey: "initiated", label: "شروع پرداخت", count: 412_000, amount: 5_100_000_000, currency: "IRR" },
    { stageKey: "bank_redirected", label: "انتقال به بانک", count: 396_000, amount: 4_910_000_000, currency: "IRR" },
    { stageKey: "attempted", label: "تلاش واقعی", count: 388_000, amount: 4_810_000_000, currency: "IRR" },
    { stageKey: "verified", label: "تأیید شده", count: 277_000, amount: 3_240_000_000, currency: "IRR" },
    { stageKey: "settled", label: "تسویه شده", count: 270_000, amount: 3_150_000_000, currency: "IRR" },
  ],
  atRiskAmount: 310_000_000,
  currency: "IRR",
};