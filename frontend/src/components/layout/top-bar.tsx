import { CalendarDays, Gauge, ShieldAlert } from "lucide-react";
import { dateRangeOptions, useGlobalFilters, type DateRangePreset } from "@/lib/global-filters";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TopBarProps = {
  dateRangePreset: DateRangePreset;
  onDateRangeChange: (value: DateRangePreset) => void;
  merchantKey: string;
  onMerchantChange: (value: string) => void;
};

export function TopBar({ dateRangePreset, onDateRangeChange, merchantKey, onMerchantChange }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex items-center gap-2 text-muted-foreground" aria-hidden="true">
        <ShieldAlert className="size-4 text-primary" />
        <span className="text-xs">داده واقعی (Docker Backend)</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DateRangeSelect value={dateRangePreset} onChange={onDateRangeChange} />
        <MerchantSelect value={merchantKey} onChange={onMerchantChange} />
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

function MerchantSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { merchants, merchantsLoading } = useGlobalFilters();
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="min-w-36" aria-label="انتخاب پذیرنده">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {merchantsLoading && (
            <SelectItem value={value} disabled>
              در حال بارگذاری...
            </SelectItem>
          )}
          {merchants.map((merchant) => (
            <SelectItem key={merchant.merchantKey} value={merchant.merchantKey}>
              {merchant.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}