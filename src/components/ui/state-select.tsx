"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { US_STATES, US_STATE_CODES, stateOptionLabel } from "@/lib/us-states";

// ============================================================================
// AQSh shtati tanlagichi (roadmap §1.3).
//
// Native `<select>`: 52 ta variant uchun kombobox ortiqcha, va native element
// tekin type-ahead beradi ("T", "X" — TX'ga sakraydi). Ko'rinishi boshqa
// maydonlar bilan bir xil bo'lishi uchun `modal-input` / `input` klasslari
// ishlatiladi (globals.css:427 select uchun chevron ham shu klassga bog'langan).
//
// Eng muhim xatti-harakat: qiymat ro'yxatda bo'lmasa (eski "Texas" yoki
// "tx" kabi yozuvlar) u ALOHIDA disabled variant sifatida ko'rsatiladi.
// Aks holda `<select>` mos variant topolmay birinchi shtatga tushib qolardi
// va foydalanuvchi Edit'ni ochib Save bosishi bilan yozuv jimgina buzilardi.
// Variant disabled — ya'ni ko'rinadi, lekin qayta tanlanmaydi.
// ============================================================================

export interface StateSelectProps {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  /** modal-input (forma) yoki input (filtr paneli). */
  variant?: "modal" | "filter";
  /** Bo'sh variant matni. Berilmasa: filtrda "All states", formada "Select state". */
  placeholder?: string;
  className?: string;
  /** `Field` yorlig'i `htmlFor`siz chiziladi, shuning uchun nom shu yerdan beriladi. */
  ariaLabel?: string;
}

export function StateSelect({
  value,
  onChange,
  name,
  id,
  required = false,
  disabled = false,
  variant = "modal",
  placeholder,
  className,
  ariaLabel = "State",
}: StateSelectProps): React.ReactElement {
  const isKnown = US_STATE_CODES.has(value);
  const emptyLabel = placeholder ?? (variant === "filter" ? "All states" : "Select state");

  return (
    <select
      id={id}
      name={name}
      value={value}
      required={required}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      className={cn(variant === "filter" ? "input" : "modal-input", className)}
    >
      {/* Majburiy maydonda bo'sh variant tanlanmaydi, lekin ro'yxatda qoladi —
          shunda qiymat "" bo'lganda select birinchi shtatni ko'rsatib
          yolg'on gapirmaydi va brauzer validatsiyasi submit'ni to'xtatadi. */}
      <option value="" disabled={required}>
        {emptyLabel}
      </option>

      {value !== "" && !isKnown && (
        <option value={value} disabled>
          {`(unknown) ${value}`}
        </option>
      )}

      {US_STATES.map((s) => (
        <option key={s.code} value={s.code}>
          {stateOptionLabel(s)}
        </option>
      ))}
    </select>
  );
}
