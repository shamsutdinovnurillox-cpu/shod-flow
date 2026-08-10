"use client";

import React from "react";
import { X, SlidersHorizontal } from "lucide-react";

// ============================================================================
// Yon tomondan chiqadigan filtr paneli.
//
// Filtrlar panel ichida "qoralama" holatda tahrirlanadi va faqat "Apply"
// bosilganda qo'llanadi — shuning uchun har bir tanlovda jadval qayta
// hisoblanmaydi. Yopish (X yoki fon) qoralamani bekor qiladi.
// ============================================================================

export function FilterButton({ activeCount, onClick }: { activeCount: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="btn btn-secondary"
    >
      <SlidersHorizontal className="h-4 w-4" />
      Filters
      {activeCount > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-fg">{activeCount}</span>
      )}
    </button>
  );
}

export function FilterDrawer({
  open,
  onClose,
  onClear,
  onApply,
  activeCount,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onClear: () => void;
  onApply: () => void;
  activeCount: number;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close filters" onClick={onClose} className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-[2px]" />

      <aside className="relative flex h-full w-full max-w-sm animate-slide-in-right flex-col border-l border-border bg-surface shadow-[var(--shadow-xl)]">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-fg">Filters</h2>
            <p className="text-xs text-muted">{activeCount} active</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClear} className="btn btn-ghost btn-sm text-danger hover:text-danger">Clear</button>
            <button onClick={onClose} aria-label="Close" className="btn btn-ghost btn-icon h-8 w-8">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">{children}</div>

        <footer className="border-t border-border p-4">
          <button
            onClick={onApply}
            className="btn btn-primary btn-lg w-full"
          >
            Apply
          </button>
        </footer>
      </aside>
    </div>
  );
}

/** Panel ichidagi bitta filtr maydoni (yorliq + boshqaruv). */
export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">{label}</label>
      {children}
    </div>
  );
}

/** Standart select — "Barchasi" varianti bilan. */
export function FilterSelect({
  value,
  onChange,
  allLabel,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input"
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/** Sanadan / Sanagacha juftligi — o'z sarlavhasi bilan. */
export function FilterDateRange({
  label,
  from,
  to,
  onFrom,
  onTo,
}: {
  label: string;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-faint">From</span>
          <input type="date" value={from} onChange={(e) => onFrom(e.target.value)}
            className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-faint">To</span>
          <input type="date" value={to} onChange={(e) => onTo(e.target.value)}
            className="input" />
        </label>
      </div>
    </div>
  );
}
