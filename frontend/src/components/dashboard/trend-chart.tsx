import type { ChartPoint } from "@/components/charts/line-chart";
import { LineChart } from "@/components/charts/line-chart";

type TrendDatum = {
  key: string;
  label: string;
  value: number;
  display: string;
};

type TrendChartProps = {
  data: TrendDatum[];
  stroke?: string;
  ariaLabel: string;
  colorLabel: string;
};

/** نمودار روند ساده: داده با برچسب فارسی به نقاط SVG تبدیل و رسم می‌شود. */
export function TrendChart({ data, stroke = "#f59e0b", ariaLabel, colorLabel }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div role="status" className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border">
        <span className="text-xs text-muted-foreground">داده‌ای برای نمودار نیست</span>
      </div>
    );
  }

  const points: ChartPoint[] = data.map((d, i) => ({ x: i, y: d.value }));

  return (
    <div>
      <LineChart points={points} ariaLabel={ariaLabel} stroke={stroke} />
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: stroke }} />
          {colorLabel}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" dir="rtl">
        {data.slice().reverse().map((d) => (
          <span key={d.key} title={d.display}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}