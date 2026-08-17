import React from "react";
import { cn } from "@/lib/utils";
import type { ColumnFilterOption } from "./column-filter";

// ============================================================================
// Jadval qobig'i — karta + `overflow-x-auto` o'ram, sarlavha uslubi, bo'sh
// holat qatori va ixtiyoriy jami qatori. Qatorlarni chaqiruvchi o'zi chizadi:
// har bir ro'yxatning katakchalari juda har xil, ularni generik "column
// renderer" ga siqish bu yerda foyda bermaydi.
//
// Qobiq hal qiladigan yagona jiddiy xato — bo'sh holatdagi `colSpan`: bugun u
// har bir ro'yxatda qo'lda sanalgan va ustun qo'shilganda unutilib qoladi.
// `head` massivi berilgani uchun bu yerda o'zi hisoblanadi.
//
// Faylda hook yo'q (profile.tsx bilan bir xil shartnoma) — shuning uchun uni
// server komponentlardan ham import qilish mumkin. Interaktiv qism
// (ColumnFilterHeader) alohida "use client" faylda va `head[].label` ga
// element sifatida uzatiladi.
// ============================================================================

export type TableDensity = "comfortable" | "compact";

/**
 * Keng ichki bo'shliq — ServicesClient / ExpensesClient / HistoryTable
 * bugun aynan shu qatorni ishlatadi.
 */
export const TH_CLASS =
  "whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6";
export const TD_CLASS = "px-5 py-3.5 sm:px-6";

/** Zich variant — TrucksClient / DriversClient (ustunlar 11+ bo'lgan jadvallar). */
export const TH_CLASS_COMPACT =
  "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted";
export const TD_CLASS_COMPACT = "px-4 py-3";

export const TABLE_CLASS = "w-full text-left text-sm text-muted";
export const THEAD_CLASS = "border-b border-border bg-surface-2/70";
export const TBODY_CLASS = "divide-y divide-border";
export const TFOOT_CLASS = "border-t border-border bg-surface-2/60 font-medium text-fg";
/** Bosilmaydigan oddiy qator. Bosiladigani uchun globals.css'dagi `.row-link`. */
export const TROW_CLASS = "transition-colors hover:bg-surface-2";
/**
 * Qatorning eng past balandligi. CSS jadvalida `height` — maksimum emas,
 * minimum: qator faqat har bir katak qisqarganda (TruncatedCell) qat'iy
 * balandlikda qoladi, faqat shu klass bilan emas.
 */
export const TROW_HEIGHT_CLASS = "h-[52px]";
export const TEMPTY_CLASS = "px-6 py-8 text-center text-muted";
/** Ikonka + ikki qatorli boy bo'sh holat uchun (ServicesClient naqshi). */
export const TEMPTY_RICH_CLASS = "px-6 py-14 text-center";

const TH_BY_DENSITY: Record<TableDensity, string> = {
  comfortable: TH_CLASS,
  compact: TH_CLASS_COMPACT,
};
const TD_BY_DENSITY: Record<TableDensity, string> = {
  comfortable: TD_CLASS,
  compact: TD_CLASS_COMPACT,
};

export interface CellClassOptions {
  density?: TableDensity;
  align?: "left" | "right";
  className?: string;
}

/** <th> klass qatori — o'z <table> ini saqlab qolgan ro'yxatlar uchun. */
export function thClass({ density = "comfortable", align, className }: CellClassOptions = {}): string {
  return cn(TH_BY_DENSITY[density], align === "right" && "text-right", className);
}

/** <td> klass qatori — thClass bilan bir xil zichlikda. */
export function tdClass({ density = "comfortable", align, className }: CellClassOptions = {}): string {
  return cn(TD_BY_DENSITY[density], align === "right" && "text-right tabular-nums", className);
}

/**
 * Ustun ta'rifi. Qobiq uni o'zi chizmaydi, lekin tip bitta joyda turadi —
 * bitta `Column<T>[]` ta'rifi jonli ro'yxatni ham, History jadvalini ham
 * boshqarishi kerak (P2/P6), shuning uchun u qator tipiga generik.
 */
export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  filter?: {
    value: (row: T) => string | null;
    /** `readonly` — `ColumnFilterHeader` bilan bir xil, enum ro'yxatlari shunday e'lon qilingan. */
    options?: readonly ColumnFilterOption[];
    searchable?: boolean;
  };
  /** "min-w-[220px]" kabi Tailwind klassi. */
  width?: string;
  align?: "left" | "right";
  /** Ustun tanlagichi uchun — yashirin ustun `head` ga tushmaydi. */
  hidden?: boolean;
}

export interface DataTableHeadCell {
  key: string;
  /** Matn yoki <ColumnFilterHeader …/> kabi element. */
  label: React.ReactNode;
  align?: "left" | "right";
  /** "min-w-[220px]" kabi Tailwind klassi. */
  width?: string;
  className?: string;
  /** Ekranda ko'rinmaydigan sarlavha (masalan "Actions") — a11y uchun matn qoladi. */
  srOnly?: boolean;
}

/** `Column<T>[]` dan sarlavha kataklari. Filtrli ustunlar `label` ni o'zi beradi. */
export function columnHead<T>(columns: readonly Column<T>[]): DataTableHeadCell[] {
  return columns
    .filter((c) => !c.hidden)
    .map((c) => ({ key: c.key, label: c.header, align: c.align, width: c.width }));
}

export interface DataTableProps {
  /** Sarlavha kataklari. Oddiy matn uchun shunchaki string berish mumkin. */
  head: readonly (string | DataTableHeadCell)[];
  /** <tr> lar. Chaqiruvchi o'z katakchalarini chizadi. */
  children: React.ReactNode;
  /** Ko'rinayotgan qatorlar soni — bo'sh holatni shu hal qiladi. */
  rowCount: number;
  emptyLabel: string;
  /** Filtr yoki qidiruv faol bo'lganda boshqa matn ("hech narsa topilmadi"). */
  emptyFilteredLabel?: string;
  /** `true` bo'lsa `emptyFilteredLabel` ishlatiladi. */
  isFiltered?: boolean;
  /** Butun bo'sh holatni almashtiradi (ikonka + izoh). */
  emptyContent?: React.ReactNode;
  /** <tfoot> ichidagi <tr> lar — jami qatori uchun. */
  footer?: React.ReactNode;
  density?: TableDensity;
  /**
   * Sarlavhani yopishtiradi. Faqat `maxHeight` bilan birga ma'noga ega:
   * o'ram vertikal scroll bo'lmasa yopishadigan narsa yo'q.
   */
  stickyHeader?: boolean;
  /** "max-h-[70vh]" kabi klass — o'ramga qo'yiladi. */
  maxHeight?: string;
  /** Ustunlar ko'p bo'lgan keng jadvallar uchun (TrucksClient naqshi). */
  nowrap?: boolean;
  /** Tashqi karta klassi. */
  className?: string;
  /** Ekranda ko'rinmaydigan <caption> — skrinriderlar jadvalni nomlab bersin. */
  caption?: string;
}

function normalizeHead(cell: string | DataTableHeadCell): DataTableHeadCell {
  return typeof cell === "string" ? { key: cell, label: cell } : cell;
}

export function DataTable({
  head,
  children,
  rowCount,
  emptyLabel,
  emptyFilteredLabel,
  isFiltered = false,
  emptyContent,
  footer,
  density = "comfortable",
  stickyHeader = false,
  maxHeight,
  nowrap = false,
  className,
  caption,
}: DataTableProps) {
  const cells = head.map(normalizeHead);

  return (
    <div className={cn("card overflow-hidden", className)}>
      <div className={cn("overflow-x-auto", maxHeight)}>
        <table className={cn(TABLE_CLASS, nowrap && "whitespace-nowrap")}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className={THEAD_CLASS}>
            <tr>
              {cells.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    TH_BY_DENSITY[density],
                    c.align === "right" && "text-right",
                    // Yopishgan sarlavha ostidan qatorlar o'tadi — fon shaffof
                    // bo'lmasligi kerak; chegara esa `border-collapse` da
                    // yo'qolib qolgani uchun inset soya bilan chiziladi.
                    stickyHeader && "sticky top-0 z-10 bg-surface-2 shadow-[inset_0_-1px_0_var(--border)]",
                    c.width,
                    c.className,
                  )}
                >
                  {c.srOnly ? <span className="sr-only">{c.label}</span> : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={TBODY_CLASS}>
            {rowCount === 0 ? (
              <tr>
                {/* colSpan qo'lda sanalmaydi — ustun qo'shilganda o'zi to'g'ri qoladi. */}
                <td colSpan={cells.length} className={emptyContent ? TEMPTY_RICH_CLASS : TEMPTY_CLASS}>
                  {emptyContent ?? (isFiltered ? emptyFilteredLabel ?? emptyLabel : emptyLabel)}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
          {footer && rowCount > 0 && <tfoot className={TFOOT_CLASS}>{footer}</tfoot>}
        </table>
      </div>
    </div>
  );
}

export interface TruncatedCellProps {
  children: React.ReactNode;
  /** "220px" yoki "14rem" — inline `max-width`, chunki qiymat ustunga bog'liq. */
  maxWidth: string;
  /** Hover'da to'liq matn. Berilmasa, matnli bola avtomatik ishlatiladi. */
  title?: string;
  className?: string;
}

/**
 * Katak ichidagi uzun matnni bitta qatorga qisqartiradi. Qat'iy qator
 * balandligi aynan shu orqali ishlaydi: `truncate` `white-space: nowrap` ni
 * talab qiladi, TrucksClient'dagi `truncate whitespace-normal` esa o'zini
 * o'zi bekor qilib turibdi.
 */
export function TruncatedCell({ children, maxWidth, title, className }: TruncatedCellProps) {
  const fallbackTitle = typeof children === "string" || typeof children === "number" ? String(children) : undefined;
  return (
    <span className={cn("block truncate", className)} style={{ maxWidth }} title={title ?? fallbackTitle}>
      {children}
    </span>
  );
}
