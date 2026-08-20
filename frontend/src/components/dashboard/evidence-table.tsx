import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TraceEvidence } from "@/api/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type EvidenceTableProps = {
  evidence: TraceEvidence[];
  formatAmount: (value: number) => string;
};

const PAGE_SIZE = 5;

/** جدول شواهد trace با pagination ساده و دسترسی‌پذیر. */
export function EvidenceTable({ evidence, formatAmount }: EvidenceTableProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(evidence.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const rows = evidence.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">جدول شواهد</CardTitle>
        <CardDescription>نمونه رکوردهای پشتیبان محاسبه (با pagination)</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-3">وضعیت</th>
                <th scope="col" className="px-2 py-2">سشن</th>
                <th scope="col" className="px-2 py-2">تلاش</th>
                <th scope="col" className="px-2 py-2">مبلغ</th>
                <th scope="col" className="px-2 py-2">PSP</th>
                <th scope="col" className="px-2 py-2">بانک</th>
                <th scope="col" className="px-2 py-2">زمان تأیید</th>
                <th scope="col" className="py-2 pl-3">در محاسبه</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.sessionKey}-${row.trySeq}`} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-3">
                    <span className="inline-block rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-xs font-mono" dir="ltr">
                      {row.status}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 font-mono text-xs" dir="ltr">{row.sessionKey}</td>
                  <td className="px-2 py-2.5 tabular-nums">{row.trySeq}</td>
                  <td className="px-2 py-2.5 tabular-nums">{formatAmount(row.amount)}</td>
                  <td className="px-2 py-2.5 font-mono text-xs" dir="ltr">{row.pspCode ?? "—"}</td>
                  <td className="px-2 py-2.5 font-mono text-xs" dir="ltr">{row.issuerBankCode ?? "—"}</td>
                  <td className="px-2 py-2.5 tabular-nums text-xs">{row.verifiedAt ? formatDateTime(row.verifiedAt) : "—"}</td>
                  <td className="py-2.5 pl-3">
                    <span
                      className={cn(
                        "inline-block rounded-md border px-1.5 py-0.5 text-xs",
                        row.included
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : "border-red-500/40 bg-red-500/10 text-red-300",
                      )}
                    >
                      {row.included ? "شامل" : "حذف"}
                    </span>
                    {!row.included && row.exclusionReason !== undefined && (
                      <span className="ml-2 text-xs text-muted-foreground">{row.exclusionReason}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            صفحه {currentPage + 1} از {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="صفحه قبل"
              disabled={currentPage === 0}
              onClick={() => setPage(Math.max(0, currentPage - 1))}
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="صفحه بعد"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("fa-IR", { month: "short", day: "numeric" });
}