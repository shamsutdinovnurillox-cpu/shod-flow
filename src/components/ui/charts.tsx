import React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Yengil SVG diagrammalari — tashqi kutubxonasiz.
//
// Hammasi server komponent sifatida ham render bo'ladi (hook yo'q) va rangni
// CSS o'zgaruvchilaridan oladi, shuning uchun tema almashganda o'zi moslashadi.
// Har bir diagramma o'z ma'nosini matn bilan ham beradi (skrinrider uchun).
// ============================================================================

export interface Slice {
  label: string;
  value: number;
  /** CSS rang qiymati; berilmasa seriya palitrasidan olinadi. */
  color?: string;
}

const SERIES = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
];

const sliceColor = (s: Slice, i: number) => s.color ?? SERIES[i % SERIES.length];

/**
 * Halqa diagramma. Yoylar `stroke-dasharray` bilan chiziladi — bu bitta
 * `<circle>` bilan ishlaydi va `path` matematikasini talab qilmaydi.
 */
export function DonutChart({
  slices,
  size = 168,
  thickness = 18,
  centerValue,
  centerLabel,
  className,
}: {
  slices: Slice[];
  size?: number;
  thickness?: number;
  centerValue?: React.ReactNode;
  centerLabel?: string;
  className?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  // Yoy uzunliklari va ularning boshlanish nuqtalari — o'zgaruvchini
  // qayta belgilamasdan, to'plangan yig'indi orqali hisoblanadi.
  const visible = slices.filter((s) => s.value > 0);
  const lengths = visible.map((s) => (s.value / total) * c);
  const arcs = visible.map((s, i) => ({
    s,
    i,
    len: lengths[i],
    offset: lengths.slice(0, i).reduce((a, b) => a + b, 0),
  }));

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={
          total === 0
            ? "No data"
            : slices.map((s) => `${s.label}: ${s.value}`).join(", ")
        }
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={thickness}
          />
          {arcs.map(({ s, i, len, offset: o }) => (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={sliceColor(s, i)}
              strokeWidth={thickness}
              strokeLinecap="butt"
              strokeDasharray={`${Math.max(len - 2, 0)} ${c}`}
              strokeDashoffset={-o}
            />
          ))}
        </g>
      </svg>
      {(centerValue !== undefined || centerLabel) && (
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="text-[26px] font-semibold leading-none tracking-tight tabular-nums text-fg">
            {centerValue}
          </span>
          {centerLabel && (
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Halqa yoniga qo'yiladigan izoh — rang, nom, qiymat va ulush. */
export function ChartLegend({ slices, total }: { slices: Slice[]; total?: number }) {
  const sum = total ?? slices.reduce((s, x) => s + x.value, 0);
  return (
    <ul className="min-w-0 flex-1 space-y-2.5">
      {slices.map((s, i) => (
        <li key={s.label} className="flex items-center gap-2.5 text-sm">
          <span className="dot" style={{ color: sliceColor(s, i) }} />
          <span className="min-w-0 flex-1 truncate text-muted">{s.label}</span>
          <span className="font-semibold tabular-nums text-fg">{s.value}</span>
          <span className="w-10 text-right text-xs tabular-nums text-faint">
            {sum > 0 ? Math.round((s.value / sum) * 100) : 0}%
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Bitta qatorda ulushlarni ko'rsatuvchi to'ldirilgan chiziq. */
export function StackedBar({
  slices,
  height = 8,
  className,
}: {
  slices: Slice[];
  height?: number;
  className?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  return (
    <div
      className={cn("flex w-full gap-0.5 overflow-hidden rounded-full bg-surface-2", className)}
      style={{ height }}
      role="img"
      aria-label={slices.map((s) => `${s.label}: ${s.value}`).join(", ")}
    >
      {total > 0 &&
        slices
          .filter((s) => s.value > 0)
          .map((s, i) => (
            <div
              key={s.label}
              className="h-full origin-left animate-[grow-x_0.6s_cubic-bezier(0.16,1,0.3,1)] first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(s.value / total) * 100}%`, background: sliceColor(s, i) }}
            />
          ))}
    </div>
  );
}

/** Yorliq + qiymat + progress chiziq. */
export function MeterRow({
  label,
  value,
  max,
  color = "var(--primary)",
  hint,
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  hint?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm text-muted">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-fg">
          {value}
          {hint && <span className="ml-1 text-xs font-normal text-faint">{hint}</span>}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full origin-left animate-[grow-x_0.6s_cubic-bezier(0.16,1,0.3,1)] rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

/**
 * Yarim doira ko'rinishidagi "sog'liq ballari" indikatori.
 * `score` 0..100 oralig'ida.
 */
export function GaugeScore({
  score,
  size = 152,
  label,
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const thickness = 12;
  const r = (size - thickness) / 2;
  const c = Math.PI * r; // yarim aylana uzunligi
  const pct = Math.max(0, Math.min(100, score));
  const tone =
    pct >= 80 ? "var(--success)" : pct >= 55 ? "var(--warning)" : "var(--danger)";

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 12 }}>
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`} role="img"
        aria-label={`${label ?? "Score"}: ${Math.round(pct)} / 100`}>
        <g transform={`translate(0 ${size / 2})`}>
          <path
            d={`M ${thickness / 2} 0 A ${r} ${r} 0 0 1 ${size - thickness / 2} 0`}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={thickness}
            strokeLinecap="round"
          />
          <path
            d={`M ${thickness / 2} 0 A ${r} ${r} 0 0 1 ${size - thickness / 2} 0`}
            fill="none"
            stroke={tone}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * c} ${c}`}
          />
        </g>
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <span className="text-3xl font-semibold leading-none tracking-tight tabular-nums text-fg">
          {Math.round(pct)}
        </span>
        {label && (
          <span className="ml-0.5 text-sm font-medium text-muted">/100</span>
        )}
      </div>
    </div>
  );
}
