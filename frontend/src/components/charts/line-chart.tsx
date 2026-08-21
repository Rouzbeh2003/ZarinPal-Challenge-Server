import { useId } from "react";

export type ChartPoint = {
  x: number;
  y: number;
};

type LineChartProps = {
  points: ChartPoint[];
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  dotColor?: string;
  ariaLabel: string;
};

/**
 * نمودار خطی سبک مبتنی بر SVG با کنترل کامل RTL.
 * نقاط ورودی به ترتیب زمانی (قدیمی به جدید) داده می‌شوند و اینجا برای جهت
 * RTL برعکس می‌شوند تا قدیمی‌ترین نقطه در راست و جدیدترین در چپ دیده شود.
 */
export function LineChart({
  points,
  width = 480,
  height = 220,
  stroke = "#f59e0b",
  strokeWidth = 2,
  dotColor = "#ffffff",
  ariaLabel,
}: LineChartProps) {
  const chartId = useId();

  if (points.length === 0) {
    return <ChartEmpty width={width} height={height} message="داده‌ای برای نمودار نیست" />;
  }

  const reversedPoints = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)).reverse();

  if (reversedPoints.length === 0) {
    return <ChartEmpty width={width} height={height} message="داده معتبر برای نمودار نیست" />;
  }

  const { plotWidth, plotHeight } = computePlotSize(width, height);
  const { xFn, yFn } = buildScales(reversedPoints, plotWidth, plotHeight);

  const pathD = reversedPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${xFn(p.x)} ${yFn(p.y)}`).join(" ");
  const plotBottom = CHART_PADDING_Y + plotHeight;
  const areaPath = `${pathD} L ${xFn(reversedPoints[reversedPoints.length - 1].x)} ${plotBottom} L ${xFn(reversedPoints[0].x)} ${plotBottom} Z`;

  return (
    <div className="w-full overflow-hidden">
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto block h-56 w-full max-w-3xl"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={`grad-${chartId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        <clipPath id={`clip-${chartId}`}>
          <rect
            x={CHART_PADDING_X - DOT_RADIUS}
            y={CHART_PADDING_Y - DOT_RADIUS}
            width={plotWidth + DOT_RADIUS * 2}
            height={plotHeight + DOT_RADIUS * 2}
          />
        </clipPath>

        <g clip={`url(#clip-${chartId})`}>
          <path d={areaPath} fill={`url(#grad-${chartId})`} />
          <path
            d={pathD}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {reversedPoints.map((p, i) => (
            <circle key={i} cx={xFn(p.x)} cy={yFn(p.y)} r={DOT_RADIUS} fill={dotColor} stroke={stroke} strokeWidth={1.5}>
              <title>{`${i + 1}`}</title>
            </circle>
          ))}
        </g>

        <g clip={`url(#clip-${chartId})`}>
          {reversedPoints.map((p, i) => (
            <circle
              key={`hit-${i}`}
              cx={xFn(p.x)}
              cy={yFn(p.y)}
              r={HIT_RADIUS}
              fill="transparent"
              className="cursor-pointer"
            >
              <title>{`نقطه ${i + 1}`}</title>
            </circle>
          ))}
        </g>
      </svg>
    </div>
  );
}

const DOT_RADIUS = 3.5;
const HIT_RADIUS = 10;
const CHART_PADDING_X = HIT_RADIUS + 2;
const CHART_PADDING_Y = HIT_RADIUS + 2;

function computePlotSize(width: number, height: number): { plotWidth: number; plotHeight: number } {
  return { plotWidth: width - CHART_PADDING_X * 2, plotHeight: height - CHART_PADDING_Y * 2 };
}

function buildScales(points: ChartPoint[], plotWidth: number, plotHeight: number) {
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const spanX = maxX - minX;
  const spanY = maxY - minY;

  const xFn = (x: number) => CHART_PADDING_X + (spanX === 0 ? 0.5 : (x - minX) / spanX) * plotWidth;
  const yFn = (y: number) => CHART_PADDING_Y + plotHeight - (spanY === 0 ? 0.5 : (y - minY) / spanY) * plotHeight;

  return { xFn, yFn };
}

function ChartEmpty({ width, height, message }: { width: number; height: number; message: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center rounded-lg border border-dashed border-border"
      style={{ width, height }}
    >
      <span className="text-xs text-muted-foreground">{message}</span>
    </div>
  );
}
