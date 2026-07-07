import React from "react";

// Profil sahifalari uchun umumiy taqdimot komponentlari (Truck/Trailer/Driver).

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
    <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="text-lg font-bold text-fg truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function DetailPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm p-6">
      <h2 className="text-lg font-bold text-fg mb-3">{title}</h2>
      {children}
    </div>
  );
}

export function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-2 text-sm border-b border-border/60 last:border-0">
      <span className="text-muted">{k}</span>
      <span className="font-medium text-fg">{v}</span>
    </div>
  );
}

export function HistoryTable({ title, head, rows }: { title: string; head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
      <h2 className="text-lg font-bold text-fg px-6 pt-6 pb-3">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-muted">
          <thead className="bg-surface-2 text-fg">
            <tr>{head.map((h) => <th key={h} className="px-6 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr><td colSpan={head.length} className="px-6 py-6 text-center text-muted">No records.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i} className="hover:bg-surface-2">{r.map((c, j) => <td key={j} className="px-6 py-3">{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0" tabIndex={-1} />
      <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-fg mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-fg mb-1">{label}</label>
      {children}
    </div>
  );
}

export function ModalActions({ loading, onCancel, submitLabel }: { loading: boolean; onCancel: () => void; submitLabel: string }) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2">Cancel</button>
      <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {loading ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}
