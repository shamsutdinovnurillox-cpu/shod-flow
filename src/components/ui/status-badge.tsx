import React from "react";
import { cn } from "@/lib/utils";
import { humanizeEnumValue } from "@/lib/enum-options";

// ============================================================================
// Yagona status "chip"i.
//
// Ilova bo'ylab o'nlab `STATUS_STYLES` xaritasi tarqalgan edi va ular bir-biri
// bilan kelishmasdi (IN_SERVICE bir joyda amber, boshqasida yellow; Trailers
// jadvalida umuman rangsiz). Rang endi bitta joyda — quyidagi TONE_CLASS
// jadvalida — hal qilinadi.
//
// Ranglar globals.css dagi mavjud `.badge` oilasidan va token
// o'zgaruvchilaridan olinadi; bu yerda yangi palitra ixtiro qilinmaydi.
// `.badge` `@layer components` ichida, shuning uchun `size="md"` dagi Tailwind
// utility'lari uning padding/font-size'ini bemalol bosib o'tadi.
//
// Fayl ataylab hook'siz va "use client"siz: status ustunlari server
// komponentlarda ham chiziladi (profile.tsx bilan bir xil shartnoma).
// ============================================================================

/**
 * Semantik ohanglar (success/warning/...) va `@/lib/enum-options` dagi rang
 * nomlari (green/amber/...) bitta birlashmada saqlanadi. Shu sabab
 * `EnumOption.tone` bu tipga struktura bo'yicha mos tushadi va StatusBadge
 * o'sha ro'yxatlarni hech qanday moslashtiruvchisiz qabul qila oladi.
 */
export type BadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "slate"
  | "green"
  | "amber"
  | "red"
  | "blue";

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "badge-neutral",
  slate: "badge-neutral",
  info: "badge-primary",
  blue: "badge-primary",
  success: "bg-success-soft text-success",
  green: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  amber: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  red: "bg-danger-soft text-danger",
};

// "sm" — `.badge` ning o'z o'lchami (jadval katagi uchun). "md" — sarlavha
// yonidagi yakka status uchun kattaroq.
const SIZE_CLASS = {
  sm: "",
  md: "px-2.5 py-1 text-xs",
} as const;

export type BadgeSize = keyof typeof SIZE_CLASS;

/**
 * `@/lib/enum-options` dagi `EnumOption` bilan struktura jihatidan bir xil.
 * Ataylab qayta e'lon qilingan: status-badge.tsx hech qanday enum ro'yxatiga
 * bog'lanmasdan yakka o'zi kompilyatsiya bo'lishi kerak.
 */
export interface BadgeOption<T extends string = string> {
  value: T;
  label: string;
  tone?: BadgeTone;
}

export interface StatusBadgeProps<T extends string = string> {
  /** Xom enum qiymati. Bo'sh yoki null — `emptyLabel` chiziladi. */
  value: T | null | undefined;
  /** Yorliq va ohangning asosiy manbasi (odatda `EnumOption[]`). */
  options?: readonly BadgeOption<T>[];
  /** Ro'yxat ortiqcha bo'lganda: qiymat → ohang xaritasi. */
  tones?: Partial<Record<T, BadgeTone>>;
  /** `tones` va `options` dan ustun turadigan aniq ohang. */
  tone?: BadgeTone;
  /**
   * Yorliqni to'liq bosib o'tadi — xom qiymat o'qishga yaroqsiz bo'lgan
   * (masalan `OWNER_OPERATOR_PAID`) yoki kontekstga qarab boshqacha
   * nomlanadigan enumlar uchun.
   */
  label?: string;
  size?: BadgeSize;
  /** Chap tarafdagi kichik ikonka (lucide-react elementi). */
  icon?: React.ReactNode;
  /** `value` bo'sh bo'lganda chiziladigan matn. */
  emptyLabel?: string;
  className?: string;
  /** To'liq matn kesilib qolganda hover uchun. */
  title?: string;
}

/**
 * `IN_SERVICE` → `In Service`. Faqat `options` berilmaganda ishlatiladigan
 * zaxira yorliq: ro'yxat bor bo'lsa, yorliq manbasi doim o'sha ro'yxat.
 *
 * Amalga oshirilishi `@/lib/enum-options` da — u yerda soha qisqartmalari
 * ro'yxati bor ("ACH_WIRE" → "ACH Wire", bu yerdagi eski nusxa esa "Ach Wire"
 * derdi). Ikkita bir xil nomli, boshqacha ishlaydigan funksiya bo'lmasligi
 * uchun shu yerda faqat qayta eksport qilinadi.
 */
export { humanizeEnumValue };

export function StatusBadge<T extends string = string>({
  value,
  options,
  tones,
  tone,
  label,
  size = "sm",
  icon,
  emptyLabel = "—",
  className,
  title,
}: StatusBadgeProps<T>) {
  // Bo'sh satr ham "qiymat yo'q" degani — DB dagi eski yozuvlarda `""` uchraydi.
  const key = value == null || value.length === 0 ? null : value;
  const option = key === null ? undefined : options?.find((o) => o.value === key);

  const text = label ?? (key === null ? emptyLabel : option?.label ?? humanizeEnumValue(key));
  const resolvedTone: BadgeTone =
    tone ?? (key === null ? "neutral" : tones?.[key] ?? option?.tone ?? "neutral");

  return (
    <span title={title} className={cn("badge", TONE_CLASS[resolvedTone], SIZE_CLASS[size], className)}>
      {icon}
      {text}
    </span>
  );
}
