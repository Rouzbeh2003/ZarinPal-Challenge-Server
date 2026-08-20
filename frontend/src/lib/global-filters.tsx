import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Merchant } from "@/api/types";
import { getMerchants } from "@/api/adapter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type DateRangePreset = "7d" | "30d" | "90d" | "all" | "custom";

export type DateRangeOption = {
  value: DateRangePreset;
  label: string;
};

export const dateRangeOptions: DateRangeOption[] = [
  { value: "7d", label: "۷ روز اخیر" },
  { value: "30d", label: "۳۰ روز اخیر" },
  { value: "90d", label: "۹۰ روز اخیر" },
  { value: "all", label: "همه (شش ماه)" },
  { value: "custom", label: "بازه دلخواه" },
];

/**
 * شروع و پایان دیتاست شناخته‌شده (از health: data_date_from=2026-01-01, data_date_to=2026-07-01).
 * در نسخه واقعی، این مقدار از health API خوانده می‌شود.
 */
const DATASET_START = "2026-01-01";
const DATASET_END = "2026-07-01";

/** تبدیل preset بازه زمانی به تاریخ‌های واقعی (ISO) نسبت به دیتاست. */
export function resolveDateRange(preset: DateRangePreset): { dateFrom: string; dateTo: string } {
  if (preset === "all") {
    return { dateFrom: DATASET_START, dateTo: DATASET_END };
  }
  const end = new Date(`${DATASET_END}T00:00:00`);
  const dateTo = DATASET_END;
  const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
  const from = new Date(end);
  from.setDate(from.getDate() - days);
  const dateFrom = from.toISOString().slice(0, 10);
  return { dateFrom, dateTo };
}

export type GlobalFilterContextValue = {
  dateRangePreset: DateRangePreset;
  setDateRangePreset: (value: DateRangePreset) => void;
  merchantKey: string;
  setMerchantKey: (value: string) => void;
  merchants: Merchant[];
  merchantsLoading: boolean;
};

export const GlobalFilterContext = createContext<GlobalFilterContextValue | null>(null);

export function GlobalFilterProvider({ children }: { children: ReactNode }) {
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("90d");
  const [merchantKey, setMerchantKey] = useState("M250");
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantsLoading, setMerchantsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMerchants()
      .then((list) => {
        if (cancelled) return;
        setMerchants(list);
        if (list.length > 0) {
          setMerchantKey((current) => (list.some((m) => m.merchantKey === current) ? current : list[0].merchantKey));
        }
      })
      .catch(() => {
        // خطای لیست مرچنت‌ها: پیش‌فرض فعلی حفظ می‌شود.
      })
      .finally(() => {
        if (!cancelled) setMerchantsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = { dateRangePreset, setDateRangePreset, merchantKey, setMerchantKey, merchants, merchantsLoading };

  return <GlobalFilterContext.Provider value={value}>{children}</GlobalFilterContext.Provider>;
}

export function useGlobalFilters(): GlobalFilterContextValue {
  const context = useContext(GlobalFilterContext);
  if (context === null) {
    throw new Error("useGlobalFilters باید درون GlobalFilterProvider استفاده شود.");
  }
  return context;
}

export function DateRangeControl() {
  const { dateRangePreset, setDateRangePreset } = useGlobalFilters();

  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
      <span>بازه زمانی</span>
      <Select value={dateRangePreset} onValueChange={setDateRangePreset}>
        <SelectTrigger className="w-full min-w-36" aria-label="انتخاب بازه زمانی">
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

export function MerchantControl() {
  const { merchantKey, setMerchantKey, merchants, merchantsLoading } = useGlobalFilters();

  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
      <span>پذیرنده</span>
      <Select value={merchantKey} onValueChange={setMerchantKey}>
        <SelectTrigger className="w-full min-w-36" aria-label="انتخاب پذیرنده">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {merchantsLoading && (
            <SelectItem value={merchantKey} disabled>
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