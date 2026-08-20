/**
 * فیکسچر تحلیل تلاش مجدد.
 *
 * ⚠️ داده «نمایشی» برای طراحی رابط است؛ اعداد واقعی نیستند.
 */

import type { RetryAnalysis } from "@/api/types";

export const mockRetryAnalysis: RetryAnalysis = {
  retryRate: {
    name: "retry_rate",
    definitionVersion: "retry_v1",
    value: 0.24,
    baseline: 0.22,
    absoluteChange: 0.02,
    relativeChange: 0.091,
    unit: "percent",
  },
  recoveryRate: {
    name: "retry_recovery_rate",
    definitionVersion: "retry_v1",
    value: 0.58,
    baseline: 0.54,
    absoluteChange: 0.04,
    relativeChange: 0.074,
    unit: "percent",
  },
  recoveredAmount: 415_000_000,
  currency: "IRR",
  atRiskAmount: 310_000_000,
  breakdown: [
    {
      pspKey: "psp-01",
      pspTitle: "PSP یک",
      issuerBankCode: "bank-009",
      switchResponseCode: "00",
      sessionCount: 91_000,
      retriedSessionCount: 21_000,
      recoveredSessionCount: 14_500,
      recoveredAmount: 218_000_000,
      currency: "IRR",
      recoveryRate: 0.69,
    },
    {
      pspKey: "psp-02",
      pspTitle: "PSP دو",
      issuerBankCode: "bank-014",
      switchResponseCode: "51",
      sessionCount: 84_000,
      retriedSessionCount: 26_500,
      recoveredSessionCount: 12_800,
      recoveredAmount: 152_000_000,
      currency: "IRR",
      recoveryRate: 0.48,
    },
    {
      pspKey: "psp-07",
      pspTitle: "PSP هفت",
      issuerBankCode: "bank-003",
      switchResponseCode: "61",
      sessionCount: 45_000,
      retriedSessionCount: 9_200,
      recoveredSessionCount: 5_700,
      recoveredAmount: 45_000_000,
      currency: "IRR",
      recoveryRate: 0.62,
    },
  ],
};