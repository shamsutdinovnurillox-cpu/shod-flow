import React from "react";
import { cn } from "@/lib/utils";

// Profil sahifalari uchun umumiy taqdimot komponentlari (Truck/Trailer/Driver).
// Bu modul server komponentlardan ham import qilinadi, shuning uchun bu yerda
// hook yo'q — interaktiv Modal alohida client faylda va shu yerdan re-export
// qilinadi (mavjud importlar o'zgarmasligi uchun).

export { Modal, ModalActions } from "./modal";
export type { ModalSize } from "./modal";

export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export function InfoCard({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="card card-interactive p-4 sm:p-5">
      <div className="flex items-center gap-3.5">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-0.5 truncate text-lg font-semibold tracking-tight text-fg">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function DetailPanel({
  title,
  action,
  children,
}: {
  title: string;
  /** Sarlavha o'ng tomonidagi ixtiyoriy boshqaruv. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight text-fg">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2.5 text-sm last:border-0">
      <span className="shrink-0 text-muted">{k}</span>
      <span className="min-w-0 text-right font-medium text-fg">{v}</span>
    </div>
  );
}

export function HistoryTable({
  title,
  head,
  rows,
  action,
}: {
  title: string;
  head: string[];
  rows: React.ReactNode[][];
  action?: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
        <h2 className="text-base font-semibold tracking-tight text-fg">{title}</h2>
        {action}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-muted">
          <thead className="border-y border-border bg-surface-2/70 text-fg">
            <tr>
              {head.map((h) => (
                <th key={h} className="whitespace-nowrap px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={head.length} className="px-6 py-8 text-center text-sm text-muted">
                  No records.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="transition-colors hover:bg-surface-hover">
                  {r.map((c, j) => (
                    <td key={j} className={cn("px-5 py-3 sm:px-6", j === 0 && "font-medium text-fg")}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  /** Maydon ostidagi kichik izoh. */
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-fg">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
