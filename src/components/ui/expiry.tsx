"use client";

import { useSyncExternalStore } from "react";
import { AlertTriangle } from "lucide-react";

// ============================================================================
// Muddat ustunlari uchun umumiy ko'rsatish: o'tib ketgan — qizil "Expired",
// 30 kun ichida — sariq "Nd" hisoblagichi, aks holda oddiy sana.
//
// Vaqt tashqi manba: render ichida `Date.now()` chaqirish nopok (React
// Compiler) va SSR/hydration farqini beradi. Snapshot kun boshiga
// yaxlitlanadi — shunda u qayta render'lar orasida barqaror bo'ladi.
// ============================================================================

const DAY = 24 * 60 * 60 * 1000;

const subscribeNever = () => () => {};
const dayStart = () => Math.floor(Date.now() / DAY) * DAY;
const noServerSnapshot = () => null;

/** Joriy kun boshi (ms) — serverda `null`, hydration'dan keyin haqiqiy qiymat. */
export function useDayStart(): number | null {
  return useSyncExternalStore(subscribeNever, dayStart, noServerSnapshot);
}

/**
 * Sana ustunlari uchun. `<input type="date">` dan kelgan "YYYY-MM-DD" UTC yarim
 * tunda saqlanadi, shuning uchun ko'rsatishda ham UTC ishlatiladi — aks holda
 * UTC'dan g'arbdagi foydalanuvchi bir kun oldingi sanani ko'radi.
 */
export const fmtDate = (d: Date | string | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
      })
    : "—";

export const fmtDateTime = (d: Date | string | null | undefined) =>
  d
    ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

/** Muddat sanasi — holatiga qarab rangli, ogohlantirish belgisi bilan. */
export function ExpiryDate({
  date,
  warnDays = 30,
}: {
  date: Date | string | null | undefined;
  warnDays?: number;
}) {
  const now = useDayStart();
  if (!date) return <span className="text-muted">—</span>;

  const text = fmtDate(date);
  // Hydration'gacha rangsiz — server va client bir xil HTML chiqaradi.
  if (now === null) return <span className="text-muted">{text}</span>;

  const days = Math.ceil((new Date(date).getTime() - now) / DAY);

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-red-600">
        {text}
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs">Expired</span>
      </span>
    );
  }
  if (days <= warnDays) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-amber-600">
        {text}
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs">{days}d</span>
      </span>
    );
  }
  return <span className="whitespace-nowrap text-muted">{text}</span>;
}

/** KPI karta — sahifa tepasidagi hisoblagichlar uchun. */
export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "green" | "amber" | "muted";
}) {
  const tones = {
    default: "border-border bg-surface",
    green: "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20",
    amber: "border-amber-200 bg-amber-50/60 dark:bg-amber-950/20",
    muted: "border-border bg-surface-2/60",
  };
  return (
    <div className={`card card-interactive p-4 sm:p-5 ${tones[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1.5 text-3xl font-semibold tracking-tight text-fg tabular-nums">{value}</p>
    </div>
  );
}
