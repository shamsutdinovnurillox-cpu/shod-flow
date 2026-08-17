"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Preset / enum tanlagichi (roadmap §1.4).
//
// Uning bitta vazifasi bor: qiymat ro'yxatda bo'lmasa, o'sha qiymat uchun
// qo'shimcha variant chizadi. Aks holda erkin matndan lug'atga o'tayotgan
// maydon (Truck Make, Document type, keyinchalik Service.shop / Expense.vendor)
// Edit oynasi ochilishi bilan birinchi variantga "sirg'alib" ketardi va Save
// eski qiymatni jimgina qayta yozardi.
//
// Variant `disabled` — ko'rinadi, lekin qayta tanlanmaydi: eski qiymatni
// o'qish mumkin, ammo yangi yozuvga tanlab bo'lmaydi.
//
// `<option>` klasslari `globals.css`dagi `modal-input` / `input` bilan bir xil,
// shuning uchun boshqa maydonlardan farq qilmaydi.
// ============================================================================

/** Sodda holat uchun oddiy satr ham yetarli: `options={["Freightliner", ...]}`. */
export type PresetOption = string | { value: string; label: string };

export interface PresetSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly PresetOption[];
  /** Bo'sh variant matni. Berilmasa: filtrda "All", formada "Select...". */
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  /** modal-input (forma) yoki input (filtr paneli). */
  variant?: "modal" | "filter";
  className?: string;
  /** `Field` yorlig'i `htmlFor`siz chiziladi — nom shu yerdan beriladi. */
  ariaLabel?: string;
  /** Ro'yxatda yo'q qiymat qanday belgilanishi. */
  legacyLabel?: (value: string) => string;
}

const toOption = (o: PresetOption): { value: string; label: string } =>
  typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label };

export function PresetSelect({
  value,
  onChange,
  options,
  placeholder,
  required = false,
  disabled = false,
  name,
  id,
  variant = "modal",
  className,
  ariaLabel,
  legacyLabel = (v) => `${v} (legacy)`,
}: PresetSelectProps): React.ReactElement {
  const items = options.map(toOption);
  const isKnown = items.some((o) => o.value === value);
  const emptyLabel = placeholder ?? (variant === "filter" ? "All" : "Select...");

  return (
    <select
      id={id}
      name={name}
      value={value}
      required={required}
      disabled={disabled}
      aria-label={ariaLabel ?? placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(variant === "filter" ? "input" : "modal-input", className)}
    >
      {/* Majburiy maydonda bo'sh variant tanlanmaydi, lekin ro'yxatdan
          olib tashlanmaydi: qiymat "" bo'lganda select birinchi variantni
          ko'rsatib yolg'on gapirmasligi kerak. */}
      <option value="" disabled={required}>
        {emptyLabel}
      </option>

      {value !== "" && !isKnown && (
        <option value={value} disabled>
          {legacyLabel(value)}
        </option>
      )}

      {items.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
