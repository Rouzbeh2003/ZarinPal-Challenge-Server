import type { ReactNode } from "react";
import type { RetryBreakdownRow } from "@/api/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type RetryBreakdownTableProps = {
  rows: RetryBreakdownRow[];
  formatPercent: (value: number) => string;
  formatAmount: (value: number) => string;
  formatCount: (value: number) => string;
};

/** جدول تفکیکی تحلیل تلاش مجدد بر اساس PSP/بانک/کد پاسخ. */
export function RetryBreakdownTable({ rows, formatPercent, formatAmount, formatCount }: RetryBreakdownTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">تفکیک تلاش مجدد</CardTitle>
        <CardDescription>به تفکیک PSP، بانک صادرکننده و کد پاسخ سوئیچ</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-3">PSP</th>
                <th scope="col" className="px-3 py-2">بانک صادرکننده</th>
                <th scope="col" className="px-3 py-2">کد پاسخ</th>
                <th scope="col" className="px-2 py-2">سشن‌ها</th>
                <th scope="col" className="px-2 py-2">با تلاش مجدد</th>
                <th scope="col" className="px-2 py-2">بازیابی‌شده</th>
                <th scope="col" className="px-2 py-2">نرخ بازیابی</th>
                <th scope="col" className="py-2 pl-3">مبلغ بازیابی‌شده</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.pspKey}-${row.issuerBankCode ?? ""}-${row.switchResponseCode ?? ""}`} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{row.pspTitle}</td>
                  <td className="px-3 py-2.5">
                    <CodeChip dir="ltr">{row.issuerBankCode ?? "—"}</CodeChip>
                  </td>
                  <td className="px-3 py-2.5">
                    <CodeChip dir="ltr">{row.switchResponseCode ?? "—"}</CodeChip>
                  </td>
                  <td className="px-2 py-2.5 tabular-nums">{formatCount(row.sessionCount)}</td>
                  <td className="px-2 py-2.5 tabular-nums">{formatCount(row.retriedSessionCount)}</td>
                  <td className="px-2 py-2.5 tabular-nums">{formatCount(row.recoveredSessionCount)}</td>
                  <td className="px-2 py-2.5 tabular-nums">{row.recoveryRate !== undefined ? formatPercent(row.recoveryRate) : "—"}</td>
                  <td className="py-2.5 pl-3 tabular-nums">{formatAmount(row.recoveredAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          بازیابی یعنی سشنی که تلاش اول آن ناموفق بوده، در تلاش بعدی موفق شده است. مبالغ در سطح سشن یک‌بار شمرده می‌شوند.
        </p>
      </CardContent>
    </Card>
  );
}

function CodeChip({ dir, children }: { dir: "ltr"; children: ReactNode }) {
  return (
    <span
      dir={dir}
      className="inline-block rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-xs font-mono tabular-nums"
    >
      {children}
    </span>
  );
}