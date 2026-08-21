import { CalendarDays, Gauge, Store } from "lucide-react";
import { dateRangeOptions, useGlobalFilters, type DateRangePreset } from "@/lib/global-filters";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TopBarProps = {
  dateRangePreset: DateRangePreset;
  onDateRangeChange: (value: DateRangePreset) => void;
  showDateRange?: boolean;
};

export function TopBar({ dateRangePreset, onDateRangeChange, showDateRange = true }: TopBarProps) {
  const { authState } = useAuth();
  const { merchantKey, setMerchantKey, merchants, merchantsLoading } = useGlobalFilters();
  const merchant = merchants.find((item) => item.merchantKey === merchantKey);
  const canSelectMerchant = authState.status === "ready" && authState.isSuperuser;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <Store aria-hidden="true" className="size-4 shrink-0 text-primary" />
          {canSelectMerchant ? (
            <label className="flex min-w-0 flex-col gap-1 text-[10px] text-muted-foreground">
              <span>انتخاب پذیرنده</span>
              <Select value={merchantKey} onValueChange={setMerchantKey} disabled={merchantsLoading || merchants.length === 0}>
                <SelectTrigger className="h-10 min-w-64 max-w-80 px-4 text-sm font-semibold" aria-label="انتخاب پذیرنده">
                  <SelectValue placeholder={merchantsLoading ? "در حال بارگذاری..." : "پذیرنده را انتخاب کنید"} />
                </SelectTrigger>
                <SelectContent>
                  {merchants.map((item) => (
                    <SelectItem key={item.merchantKey} value={item.merchantKey}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          ) : (
            <div className="min-w-0 leading-tight">
              <span className="block text-[10px] text-muted-foreground">نام پذیرنده</span>
              <span className="block truncate text-sm font-semibold">
                {merchantsLoading ? "در حال بارگذاری..." : merchant?.title || merchantKey}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showDateRange && <DateRangeSelect value={dateRangePreset} onChange={onDateRangeChange} />}
        <Button variant="outline" size="icon" aria-label="شاخص سلامت پرداخت (به‌زودی)" disabled>
          <Gauge aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </header>
  );
}

function DateRangeSelect({ value, onChange }: { value: DateRangePreset; onChange: (value: DateRangePreset) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="min-w-32" aria-label="انتخاب بازه زمانی">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {dateRangeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
