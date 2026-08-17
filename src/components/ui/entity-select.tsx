"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Entity tanlagichlari: haydovchi va unit (truck / trailer / umumiy fleet).
//
// Ikkalasi ham native <select> — 50-500 qatorli ro'yxatda type-ahead, mobil
// native picker va klaviatura bilan ishlash tekinga keladi; ular uchun maxsus
// popover yozish faqat regressiya qo'shardi.
//
// Bitta boshqaruv ikki joyda turadi: modal formada (`modal-input`) va jadval
// ustidagi filtr qatorida (ixchamroq `input`) — shuning uchun `variant`.
//
// MUHIM invariant: saqlangan id ro'yxatda topilmasa maydon BO'SHATILMAYDI.
// O'chirilgan yozuv tanlab bo'lmaydigan "(removed)" varianti sifatida
// ko'rsatiladi — aks holda eski qatorni Edit uchun ochishning o'zi bog'lanishni
// jimgina uzib, saqlashda uni yo'q qilib yuborardi.
// ============================================================================

export type EntitySelectVariant = "modal" | "filter";

const VARIANT_CLASS: Record<EntitySelectVariant, string> = {
  modal: "modal-input",
  // Jadval ustidagi qator past bo'ladi: `.input` @layer components'da, shuning
  // uchun utility klasslar uning padding'ini ustidan yozadi.
  filter: "input h-9 py-1.5",
};

// ---------------------------------------------------------------------------
// Unit qiymatini kodlash
// ---------------------------------------------------------------------------

/** Truck va trailer aralash ro'yxatida "umumiy fleet" qatorlarini bildiradi. */
export const FLEET_UNIT_VALUE = "FLEET";

export type UnitKind = "truck" | "trailer" | "both";

/**
 * Bitta <select> ikkita jadvaldan qiymat qaytaradi, shuning uchun tur ham
 * qiymat ichida yuriladi: "TRUCK:{id}" / "TRAILER:{id}" / "FLEET".
 */
export type ParsedUnitValue =
  | { kind: "FLEET"; id: null }
  | { kind: "TRUCK"; id: string }
  | { kind: "TRAILER"; id: string };

/** Kodlangan qiymatni yasaydi. Id kerak bo'lgan turda id bo'lmasa — bo'sh satr. */
export function unitValue(kind: "TRUCK" | "TRAILER" | "FLEET", id?: string | null): string {
  if (kind === "FLEET") return FLEET_UNIT_VALUE;
  return id ? `${kind}:${id}` : "";
}

/** Kodlangan qiymatni ajratadi; bo'sh yoki notanish format uchun `null`. */
export function parseUnitValue(value: string | null | undefined): ParsedUnitValue | null {
  if (!value) return null;
  if (value === FLEET_UNIT_VALUE) return { kind: "FLEET", id: null };

  // `split(":")` emas: id ichida ham ikki nuqta uchrasa u qiymatni kesib
  // tashlardi. Faqat birinchi ajratgich hisobga olinadi.
  const sep = value.indexOf(":");
  if (sep < 0) return null;

  const kind = value.slice(0, sep);
  const id = value.slice(sep + 1);
  if (!id) return null;
  if (kind === "TRUCK") return { kind: "TRUCK", id };
  if (kind === "TRAILER") return { kind: "TRAILER", id };
  return null;
}

/**
 * `UnitSelect` filtrlaydigan qator uchun minimal shakl. Service, Expense va
 * Assignment qatorlari shu maydonlarga ega, shuning uchun ular struktura
 * bo'yicha mos keladi.
 */
export interface UnitRowLike {
  truckId?: string | null;
  trailerId?: string | null;
  entityType?: string | null;
}

/** Qator tanlangan unitga to'g'ri keladimi. Bo'sh qiymat — "barchasi". */
export function matchesUnit(row: UnitRowLike, value: string | null | undefined): boolean {
  const parsed = parseUnitValue(value);
  if (!parsed) return true;

  if (parsed.kind === "TRUCK") return row.truckId === parsed.id;
  if (parsed.kind === "TRAILER") return row.trailerId === parsed.id;

  // "FLEET" — hech qaysi unitga biriktirilmagan qator. `entityType` erkin matn
  // ustuni (schema.prisma:286), shuning uchun asosiy mezon — ikkala FK ham
  // bo'sh bo'lishi; `entityType` faqat qo'shimcha tasdiq.
  return row.entityType === "FLEET" || (!row.truckId && !row.trailerId);
}

// ---------------------------------------------------------------------------
// UnitSelect
// ---------------------------------------------------------------------------

export interface TruckOption {
  id: string;
  unitNumber: string;
}

export interface TrailerOption {
  id: string;
  trailerNumber: string;
}

export interface UnitSelectProps {
  /** "TRUCK:{id}" / "TRAILER:{id}" / "FLEET" / "" */
  value: string;
  onChange: (value: string) => void;
  /** Qaysi ro'yxatlar ko'rsatiladi. "both" bo'lsa optgroup'larga ajratiladi. */
  kind?: UnitKind;
  trucks?: readonly TruckOption[];
  trailers?: readonly TrailerOption[];
  /** Bo'sh variant. Berilmasa: filtrda bor ("All units"), modalda yo'q. */
  allowNone?: boolean;
  noneLabel?: string;
  /** "General Fleet" varianti — unitga bog'lanmagan xarajatlar uchun. */
  includeFleet?: boolean;
  fleetLabel?: string;
  variant?: EntitySelectVariant;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  /** Ro'yxatda topilmagan qiymat uchun yorliq (chaqiruvchi eski nomni bilsa). */
  missingLabel?: string;
  /** `Field` yorliq'ni `htmlFor` bilan bog'lamaydi — nom shu yerdan beriladi. */
  ariaLabel?: string;
}

const KIND_NOUN: Record<UnitKind, string> = {
  truck: "truck",
  trailer: "trailer",
  both: "unit",
};

export function UnitSelect({
  value,
  onChange,
  kind = "both",
  trucks = [],
  trailers = [],
  allowNone,
  noneLabel,
  includeFleet = false,
  fleetLabel = "General Fleet",
  variant = "modal",
  required,
  disabled,
  name,
  id,
  className,
  missingLabel,
  ariaLabel,
}: UnitSelectProps): React.ReactElement {
  const showTrucks = kind !== "trailer";
  const showTrailers = kind !== "truck";
  const grouped = kind === "both";

  const noun = KIND_NOUN[kind];
  const withNone = allowNone ?? variant === "filter";
  const placeholder = noneLabel ?? (variant === "filter" ? `All ${noun}s` : `Select ${noun}…`);

  const parsed = parseUnitValue(value);
  const known =
    parsed === null
      ? true
      : parsed.kind === "FLEET"
        ? includeFleet
        : parsed.kind === "TRUCK"
          ? showTrucks && trucks.some((t) => t.id === parsed.id)
          : showTrailers && trailers.some((t) => t.id === parsed.id);

  const removedLabel =
    missingLabel ??
    `${parsed?.kind === "TRAILER" ? "Trailer" : parsed?.kind === "TRUCK" ? "Truck" : "Unit"} (removed)`;

  const truckOptions = trucks.map((t) => (
    <option key={t.id} value={unitValue("TRUCK", t.id)}>
      {t.unitNumber}
    </option>
  ));
  const trailerOptions = trailers.map((t) => (
    <option key={t.id} value={unitValue("TRAILER", t.id)}>
      {t.trailerNumber}
    </option>
  ));

  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled}
      aria-label={ariaLabel ?? `${noun.charAt(0).toUpperCase()}${noun.slice(1)}`}
      className={cn(VARIANT_CLASS[variant], className)}
    >
      {/* Bo'sh variant "hech nima tanlanmagan" holatini ko'rsatadi. Majburiy
          maydonda u tanlab bo'lmaydigan qilinadi — aks holda brauzer birinchi
          qatorni jimgina tanlagandek ko'rinardi. */}
      {(withNone || value === "") && (
        <option value="" disabled={!withNone}>
          {placeholder}
        </option>
      )}

      {!known && value !== "" && (
        <option value={value} disabled>
          {removedLabel}
        </option>
      )}

      {includeFleet && <option value={FLEET_UNIT_VALUE}>{fleetLabel}</option>}

      {grouped ? (
        <>
          {trucks.length > 0 && <optgroup label="Trucks">{truckOptions}</optgroup>}
          {trailers.length > 0 && <optgroup label="Trailers">{trailerOptions}</optgroup>}
        </>
      ) : (
        <>
          {showTrucks && truckOptions}
          {showTrailers && trailerOptions}
        </>
      )}
    </select>
  );
}

// ---------------------------------------------------------------------------
// DriverSelect
// ---------------------------------------------------------------------------

export interface DriverOption {
  id: string;
  firstName: string;
  lastName: string;
  /** ACTIVE | ON_LEAVE | TERMINATED — guruhlash uchun. */
  status?: string | null;
}

export interface DriverSelectProps {
  value: string;
  onChange: (value: string) => void;
  drivers: readonly DriverOption[];
  /** Bo'sh variant. Berilmasa: filtrda bor ("All drivers"), modalda yo'q. */
  allowNone?: boolean;
  noneLabel?: string;
  variant?: EntitySelectVariant;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  /**
   * id → sabab ("assigned to 104"). Shu haydovchilar o'chirilgan holatda,
   * sababi yorliqda ko'rinadi — bandligini tanlashdan OLDIN bilish kerak.
   */
  disabledReasons?: Record<string, string>;
  /** Ro'yxatda topilmagan qiymat uchun yorliq. */
  missingLabel?: string;
  ariaLabel?: string;
}

export function driverName(driver: DriverOption): string {
  return `${driver.firstName} ${driver.lastName}`.trim();
}

/** Yorliqqa holat izohi qo'shiladi — "Active" guruhida ON_LEAVE ham turadi. */
function driverLabel(driver: DriverOption, reason: string | undefined): string {
  const parts = [driverName(driver)];
  if (driver.status === "ON_LEAVE") parts.push("On Leave");
  if (reason) parts.push(reason);
  return parts.length > 1 ? `${parts[0]} — ${parts.slice(1).join(", ")}` : parts[0];
}

export function DriverSelect({
  value,
  onChange,
  drivers,
  allowNone,
  noneLabel,
  variant = "modal",
  required,
  disabled,
  name,
  id,
  className,
  disabledReasons,
  missingLabel = "Unknown driver (removed)",
  ariaLabel = "Driver",
}: DriverSelectProps): React.ReactElement {
  const withNone = allowNone ?? variant === "filter";
  const placeholder = noneLabel ?? (variant === "filter" ? "All drivers" : "Select driver…");

  // Tartib chaqiruvchidan keladi (P1 `sortDriversByStatus`), bu yerda faqat
  // guruhga ajratiladi — ichkarida qayta saralash chaqiruvchining tartibini
  // buzardi.
  const active = drivers.filter((d) => d.status !== "TERMINATED");
  const terminated = drivers.filter((d) => d.status === "TERMINATED");
  const known = value === "" || drivers.some((d) => d.id === value);

  const renderOption = (driver: DriverOption) => {
    const reason = disabledReasons?.[driver.id];
    return (
      <option
        key={driver.id}
        value={driver.id}
        // Joriy tanlov hech qachon o'chirilmaydi: aks holda mavjud yozuvni
        // tahrirlashda o'z haydovchisi tanlanmagan holga tushib qolardi.
        disabled={reason !== undefined && driver.id !== value}
      >
        {driverLabel(driver, reason)}
      </option>
    );
  };

  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(VARIANT_CLASS[variant], className)}
    >
      {(withNone || value === "") && (
        <option value="" disabled={!withNone}>
          {placeholder}
        </option>
      )}

      {!known && (
        <option value={value} disabled>
          {missingLabel}
        </option>
      )}

      {/* Ishdan bo'shagan haydovchini biriktirish — xato, shuning uchun u
          alohida guruhda va doim eng pastda turadi. */}
      {active.length > 0 && <optgroup label="Active">{active.map(renderOption)}</optgroup>}
      {terminated.length > 0 && <optgroup label="Terminated">{terminated.map(renderOption)}</optgroup>}
    </select>
  );
}
