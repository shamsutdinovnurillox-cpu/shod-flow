"use client";

import { useState, useSyncExternalStore } from "react";
import type { DeviceWithTruck, Truck } from "@/types/models";
import { Field, Modal, ModalActions } from "@/components/ui/profile";
import { changeDeviceTruck } from "@/app/actions/devices";
import { showError } from "@/components/ui/toast";

// ============================================================================
// Device UI uchun umumiy qismlar — Truck profilidagi panel va alohida
// /fleet/devices sahifasi ikkalasi ham shulardan foydalanadi.
// ============================================================================

export const CONDITION_OPTIONS = [
  { value: "NEW", label: "New" },        // yangi
  { value: "USED", label: "Used" },      // ishlatilgan
  { value: "OLD", label: "Old" },        // eski
] as const;

/** TZ 4.2 qurilma turlari — Trucks jadvalidagi S/N ustunlariga mos. */
export const TYPE_OPTIONS = [
  { value: "MOTIVE_GATEWAY", label: "Motive Gateway" },
  { value: "CAMERA", label: "Camera" },
  { value: "PREPASS", label: "PrePass" },
  { value: "ELD_PT30", label: "ELD PT30" },
  { value: "TABLET", label: "Tablet" },
  { value: "CHAINS", label: "Chains" },
  { value: "OTHER", label: "Other" },
] as const;

export const typeLabel = (t: string) => TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;

const CONDITION_STYLES: Record<string, string> = {
  NEW: "bg-green-50 text-green-700",
  USED: "bg-blue-50 text-blue-700",
  OLD: "bg-amber-50 text-amber-700",
};

export function ConditionBadge({ condition }: { condition: string }) {
  const label = CONDITION_OPTIONS.find((c) => c.value === condition)?.label ?? condition;
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${CONDITION_STYLES[condition] ?? "bg-surface-2 text-muted"}`}>
      {label}
    </span>
  );
}

const DAY = 24 * 60 * 60 * 1000;

// Vaqt — tashqi manba: render ichida `Date.now()` chaqirish nopok (React
// Compiler) va SSR/hydration farqini beradi. Snapshot kun boshiga
// yaxlitlanadi — shunda u qayta render'lar orasida barqaror bo'ladi.
const subscribeNever = () => () => {};
const dayStart = () => Math.floor(Date.now() / DAY) * DAY;
const noServerSnapshot = () => null;

/** Joriy kun boshi (ms) — serverda `null`, hydration'dan keyin haqiqiy qiymat. */
function useDayStart(): number | null {
  return useSyncExternalStore(subscribeNever, dayStart, noServerSnapshot);
}

/** Muddat: o'tib ketgan — qizil, 30 kun ichida — sariq, aks holda oddiy. */
export function ExpiryCell({ date }: { date: Date | string | null }) {
  const now = useDayStart();
  if (!date) return <span className="text-muted">—</span>;

  const d = new Date(date);
  // Sana UTC yarim tunda saqlanadi — UTC'da ko'rsatiladi (fmtDate bilan bir xil).
  const text = d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
  if (now === null) return <span className="text-muted">{text}</span>;

  const days = Math.ceil((d.getTime() - now) / DAY);
  const tone =
    days < 0 ? "text-red-600 font-semibold" : days <= 30 ? "text-amber-600 font-medium" : "text-muted";
  const suffix = days < 0 ? " (expired)" : days <= 30 ? ` (${days}d)` : "";
  return <span className={tone}>{text}{suffix}</span>;
}

export interface DeviceForm {
  name: string;
  type: string;
  serialNumber: string;
  vin: string;
  expiryDate: string;
  condition: string;
  truckId: string;
  installedAt: string;
  notes: string;
}

/**
 * Foydalanuvchining MAHALLIY bugungi sanasi "YYYY-MM-DD" ko'rinishida.
 * `toISOString()` UTC kunini beradi — UTC'dan g'arbda kechqurun u ertangi
 * sanani ko'rsatib qo'yadi.
 */
export const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const emptyDeviceForm = (defaults: Partial<DeviceForm> = {}): DeviceForm => ({
  name: "",
  type: "MOTIVE_GATEWAY",
  serialNumber: "",
  vin: "",
  expiryDate: "",
  condition: "NEW",
  truckId: "",
  installedAt: today(),
  notes: "",
  ...defaults,
});

export const deviceToForm = (d: DeviceWithTruck): DeviceForm => ({
  name: d.name,
  type: d.type,
  serialNumber: d.serialNumber ?? "",
  vin: d.vin ?? "",
  expiryDate: d.expiryDate ? new Date(d.expiryDate).toISOString().split("T")[0] : "",
  condition: d.condition,
  truckId: d.truckId ?? "",
  installedAt: d.assignments[0]?.installedAt
    ? new Date(d.assignments[0].installedAt).toISOString().split("T")[0]
    : "",
  notes: d.notes ?? "",
});

/**
 * Add/Edit modal ichidagi maydonlar. `trucks` berilmasa (truck profilidan
 * chaqirilganda) unit tanlash ko'rsatilmaydi — truck allaqachon ma'lum.
 */
export function DeviceFormFields({
  form,
  onChange,
  trucks,
  showInstalledAt = false,
}: {
  form: DeviceForm;
  onChange: (patch: Partial<DeviceForm>) => void;
  trucks?: Truck[];
  /** Faqat "qo'shish" oqimida — tahrirlashda truck changeDeviceTruck orqali o'zgaradi. */
  showInstalledAt?: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Type">
          <select className="modal-input" value={form.type}
            onChange={(e) => {
              // Nom hali bo'sh yoki avvalgi turdan avtomatik qo'yilgan bo'lsa — yangilaymiz.
              const auto = form.name === "" || form.name === typeLabel(form.type);
              onChange(auto ? { type: e.target.value, name: typeLabel(e.target.value) } : { type: e.target.value });
            }}>
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Name">
          <input required className="modal-input" value={form.name}
            onChange={(e) => onChange({ name: e.target.value })} />
        </Field>
        <Field label="Serial Number (S/N)">
          <input className="modal-input" value={form.serialNumber}
            onChange={(e) => onChange({ serialNumber: e.target.value })} />
        </Field>
        <Field label="VIN Number">
          <input className="modal-input" value={form.vin}
            onChange={(e) => onChange({ vin: e.target.value })} />
        </Field>
        <Field label="Expiry Date">
          <input type="date" className="modal-input" value={form.expiryDate}
            onChange={(e) => onChange({ expiryDate: e.target.value })} />
        </Field>
        <Field label="Condition">
          <select className="modal-input" value={form.condition}
            onChange={(e) => onChange({ condition: e.target.value })}>
            {CONDITION_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>
        {trucks && (
          <Field label="Truck">
            <select className="modal-input" value={form.truckId}
              onChange={(e) => onChange({ truckId: e.target.value })}>
              <option value="">Unassigned (in stock)</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>{t.unitNumber}</option>
              ))}
            </select>
          </Field>
        )}
        {/* Truck tanlangan bo'lsa o'rnatish sanasi majburiy — tarix shundan quriladi. */}
        {showInstalledAt && form.truckId !== "" && (
          <Field label="Installed On">
            <input required type="date" className="modal-input" value={form.installedAt}
              onChange={(e) => onChange({ installedAt: e.target.value })} />
          </Field>
        )}
      </div>
      <Field label="Notes">
        <input className="modal-input" value={form.notes}
          onChange={(e) => onChange({ notes: e.target.value })} />
      </Field>
    </>
  );
}

/**
 * Qurilmani boshqa truck'ga ko'chirish modali.
 *
 * Sana majburiy: eski biriktiruv shu sanada yopiladi, yangisi shu sanada
 * boshlanadi — device history shundan quriladi.
 */
export function ChangeTruckModal({
  device,
  trucks,
  onClose,
  onMoved,
}: {
  device: DeviceWithTruck;
  trucks: Truck[];
  onClose: () => void;
  onMoved: (updated: DeviceWithTruck) => void;
}) {
  const [truckId, setTruckId] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const currentLabel = device.truck ? device.truck.unitNumber : "In stock";
  // Aynan FAOL biriktiruv kerak — device profilida assignments[0] eng oxirgi
  // yozuv bo'lib, u allaqachon yopilgan bo'lishi mumkin.
  const installedAt = device.assignments.find((a) => a.isActive)?.installedAt;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await changeDeviceTruck({ deviceId: device.id, truckId, date, notes });
      onMoved(updated);
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Ko'chirishda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Change Truck" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
          <p className="font-medium text-fg">{device.name}{device.serialNumber ? ` · ${device.serialNumber}` : ""}</p>
          <p className="text-muted">
            Currently on <span className="font-medium text-fg">{currentLabel}</span>
            {installedAt && ` since ${new Date(installedAt).toLocaleDateString()}`}
          </p>
        </div>

        <Field label="Move To">
          <select className="modal-input" value={truckId} onChange={(e) => setTruckId(e.target.value)}>
            <option value="">Remove from truck (back to stock)</option>
            {trucks
              .filter((t) => t.id !== device.truckId)
              .map((t) => <option key={t.id} value={t.id}>{t.unitNumber} — {t.make} {t.year}</option>)}
          </select>
        </Field>

        <Field label="Change Date">
          <input required type="date" className="modal-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <p className="-mt-2 text-xs text-muted">
          Previous assignment is closed on this date and the new one starts on it.
        </p>

        <Field label="Reason / Notes">
          <input className="modal-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <ModalActions loading={loading} onCancel={onClose} submitLabel="Move Device" />
      </form>
    </Modal>
  );
}

/** Jadval ichidagi kichik amal tugmalari (matn havola emas). */
export function ActionButton({
  onClick,
  tone = "neutral",
  children,
}: {
  onClick: () => void;
  tone?: "neutral" | "danger" | "primary";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "border-border text-fg hover:bg-surface-2",
    primary: "border-blue-200 text-blue-600 hover:bg-blue-50",
    danger: "border-red-200 text-red-600 hover:bg-red-50",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
