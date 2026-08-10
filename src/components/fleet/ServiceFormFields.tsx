"use client";

import React from "react";
import { ClipboardList } from "lucide-react";
import { Field, money } from "@/components/ui/profile";
import { fmtDateTime } from "@/components/ui/expiry";
import { cn } from "@/lib/utils";
import type { Truck, Trailer, ServiceWithUnit } from "@/types/models";

// ============================================================================
// Xizmat formasining maydonlari — yagona manba.
//
// Uch joyda ishlatiladi: ro'yxatdagi "Add Services", ro'yxatdagi "Edit" va
// detail sahifasidagi "Edit". Shu sababli qo'shish va tahrirlash formalari
// bir xil ko'rinadi va bir joyda o'zgartiriladi.
// ============================================================================

export interface ServiceFormValues {
  entityType: string;
  unitId: string;
  serviceDate: string;
  serviceType: string;
  shop: string;
  mechanic: string;
  cost: string;
  lessorPaid: boolean;
  odometer: string;
  description: string;
}

export const emptyServiceForm = (): ServiceFormValues => ({
  entityType: "TRUCK",
  unitId: "",
  serviceDate: new Date().toISOString().split("T")[0],
  serviceType: "",
  shop: "",
  mechanic: "",
  cost: "",
  lessorPaid: false,
  odometer: "",
  description: "",
});

/**
 * Saqlashdan oldingi tekshiruv. Server ham xuddi shu qoidalarni qayta
 * tekshiradi — bu yerdagisi shunchaki tezroq javob berish uchun.
 */
export function validateServiceForm(f: ServiceFormValues): string | null {
  if (!f.unitId) return "Unit tanlanmagan.";
  if (!f.serviceType.trim()) return "Xizmat turi kiritilmagan.";
  if (!f.shop.trim()) return "Servis (shop) kiritilmagan.";
  if (!f.cost && !f.lessorPaid) return "Narx majburiy (yoki rental/lessor belgilansin).";
  return null;
}

/**
 * Modal ichidagi ikki panelli joylashuv: chapda forma, o'ngda yordamchi panel.
 * Qo'shish oynasida o'ngda savat, tahrirlashda esa yozuv ma'lumoti turadi —
 * shu sababli ikkala oyna bir xil kenglikda va bir xil kompozitsiyada ochiladi.
 */
export function ServiceFormLayout({
  aside,
  children,
}: {
  aside: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">{children}</div>
      <div className="lg:col-span-2">{aside}</div>
    </div>
  );
}

/** O'ng paneldagi umumiy "quti" — savat va yozuv paneli bir xil ko'rinadi. */
export function ServiceAside({
  icon: Icon,
  title,
  badge,
  footerLabel,
  footerValue,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: React.ReactNode;
  footerLabel: string;
  footerValue: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-surface-2/40">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted" />
          <span className="text-sm font-semibold text-fg">{title}</span>
        </div>
        {badge}
      </div>

      <div className="min-h-[180px] flex-1 overflow-y-auto p-2 lg:max-h-[calc(88vh-19rem)]">{children}</div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{footerLabel}</span>
        <span className="text-base font-semibold tabular-nums text-fg">{footerValue}</span>
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
};

/** Tahrirlash oynasining o'ng paneli — tegilmaydigan ma'lumotlar. */
export function ServiceRecordAside({ service }: { service: ServiceWithUnit }) {
  const isTruck = service.entityType === "TRUCK";
  const unit = isTruck ? service.truck?.unitNumber : service.trailer?.trailerNumber;

  const rows: { k: string; v: React.ReactNode }[] = [
    { k: "Unit", v: `${isTruck ? "Truck" : "Trailer"} ${unit ?? "—"}` },
    { k: "Status", v: service.status.replace("_", " ") },
    { k: "Arrival", v: fmtDateTime(service.arrivalTime) },
    { k: "Completed", v: fmtDateTime(service.completionTime) },
    { k: "Created", v: fmtDateTime(service.createdAt) },
    { k: "Last updated", v: fmtDateTime(service.updatedAt) },
  ];

  return (
    <ServiceAside
      icon={ClipboardList}
      title="Yozuv"
      badge={
        <span className={cn("badge", STATUS_STYLES[service.status] ?? "badge-neutral")}>
          {service.status.replace("_", " ")}
        </span>
      }
      footerLabel="Joriy narx"
      footerValue={service.cost != null ? money(service.cost) : "—"}
    >
      <dl className="px-2 py-1">
        {rows.map((r) => (
          <div
            key={r.k}
            className="flex items-baseline justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0"
          >
            <dt className="shrink-0 text-muted">{r.k}</dt>
            <dd className="min-w-0 truncate text-right font-medium text-fg">{r.v}</dd>
          </div>
        ))}
      </dl>
    </ServiceAside>
  );
}

export function ServiceFormFields({
  value,
  onChange,
  trucks,
  trailers,
}: {
  value: ServiceFormValues;
  onChange: (patch: Partial<ServiceFormValues>) => void;
  trucks: Truck[];
  trailers: Trailer[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Asset Type">
          <select
            className="modal-input"
            value={value.entityType}
            // Tur o'zgarsa, tanlangan unit boshqa ro'yxatdan bo'lib qoladi.
            onChange={(e) => onChange({ entityType: e.target.value, unitId: "" })}
          >
            <option value="TRUCK">Truck</option>
            <option value="TRAILER">Trailer</option>
          </select>
        </Field>

        <Field label="Unit">
          <select
            className="modal-input"
            value={value.unitId}
            onChange={(e) => onChange({ unitId: e.target.value })}
          >
            <option value="">Select Unit</option>
            {value.entityType === "TRUCK"
              ? trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.unitNumber}
                  </option>
                ))
              : trailers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.trailerNumber}
                  </option>
                ))}
          </select>
        </Field>

        <Field label="Service Type">
          <input
            className="modal-input"
            placeholder="Oil change, brake job…"
            value={value.serviceType}
            onChange={(e) => onChange({ serviceType: e.target.value })}
          />
        </Field>

        <Field label="Date">
          <input
            type="date"
            className="modal-input"
            value={value.serviceDate}
            onChange={(e) => onChange({ serviceDate: e.target.value })}
          />
        </Field>

        <Field label="Shop">
          <input
            className="modal-input"
            value={value.shop}
            onChange={(e) => onChange({ shop: e.target.value })}
          />
        </Field>

        <Field label="Mechanic">
          <input
            className="modal-input"
            value={value.mechanic}
            onChange={(e) => onChange({ mechanic: e.target.value })}
          />
        </Field>

        <Field label="Cost ($)">
          <input
            type="number"
            step="0.01"
            className="modal-input"
            disabled={value.lessorPaid}
            value={value.cost}
            onChange={(e) => onChange({ cost: e.target.value })}
          />
        </Field>

        {value.entityType === "TRUCK" && (
          <Field label="Odometer">
            <input
              type="number"
              className="modal-input"
              value={value.odometer}
              onChange={(e) => onChange({ odometer: e.target.value })}
            />
          </Field>
        )}
      </div>

      <label className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2/50 px-3 py-2.5 text-sm text-fg">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={value.lessorPaid}
          // Belgilansa narx maydoni bo'shatiladi — PRD 4.5 bo'yicha ixtiyoriy.
          onChange={(e) => onChange({ lessorPaid: e.target.checked, cost: e.target.checked ? "" : value.cost })}
        />
        Rental / lessor-paid (cost optional)
      </label>

      <Field label="Description">
        <textarea
          rows={2}
          className="modal-input"
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </Field>
    </div>
  );
}
