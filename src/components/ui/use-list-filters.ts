"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { matchesQuery, type QueryPart } from "@/lib/utils";

// ============================================================================
// Ro'yxat sahifalari uchun filtr holati. Ikki xil naqsh, bitta fayl:
//
//   useListFilters  — ustun sarlavhasidagi ko'p tanlovli filtrlar
//                     (`ColumnFilterHeader`) + erkin matn qidiruvi. Tanlov
//                     bosilishi bilan qo'llanadi, "Apply" tugmasi yo'q.
//   useDraftFilters — yon paneldagi (`FilterDrawer`) qoralama/qo'llangan
//                     juftligi: panel ichida tahrirlanadi, "Apply" bosilganda
//                     qo'llanadi.
//
// Ikkalasi ham holatni faqat React state'da saqlaydi. Yagona effekt — ref'ni
// yangilash; hech qanday hisoblash chaqiruvchining prop/funksiya identifikatori
// o'zgarganda qayta ishga tushmaydi. Aks holda har bosilgan tugmadan keyin
// ro'yxat qayta qurilib, inputdan fokus o'g'irlanardi.
// ============================================================================

/** Ustun → tanlangan qiymatlar. Bo'sh massiv yoki kaliting yo'qligi — "barchasi". */
export type FilterValues = Readonly<Record<string, readonly string[]>>;

/**
 * Qatordan filtr qiymatini oladi. `null`/`undefined` — qiymati yo'q (bo'sh
 * chelak, `""`). Massiv ham qaytarish mumkin: bitta truck bir nechta qurilma
 * turiga ega bo'lgani kabi, bir qator bir nechta qiymatga tegishli bo'ladi.
 */
export type FilterAccessor<T> = (row: T) => string | null | undefined | readonly string[];

export type FilterAccessors<T> = Readonly<Record<string, FilterAccessor<T>>>;

/** Qidiruv haystack'i — qatorning matn ustunlari. */
export type SearchParts<T> = (row: T) => readonly QueryPart[];

export interface FacetCount {
  value: string;
  count: number;
}

export interface ListFilters<T> {
  query: string;
  setQuery: (value: string) => void;
  filters: FilterValues;
  /** Ustunning tanlovi. Bo'sh holatda barqaror massiv qaytadi (memo buzilmasin). */
  selected: (column: string) => readonly string[];
  setFilter: (column: string, values: readonly string[]) => void;
  clearFilter: (column: string) => void;
  /** Qidiruvni ham, barcha ustun filtrlarini ham tozalaydi. */
  clearAll: () => void;
  /** Faol ustun filtrlari soni. Qidiruv bu songa kirmaydi — u alohida ko'rinadi. */
  activeCount: number;
  /** Qidiruv yoki filtr borligi — "hech narsa topilmadi" matnini tanlash uchun. */
  isFiltered: boolean;
  apply: (rows: readonly T[], accessors: FilterAccessors<T>, searchParts?: SearchParts<T>) => T[];
  /** Ustun variantlari bo'yicha sanoq (tez qidirish uchun Map). */
  facetCounts: (
    column: string,
    rows: readonly T[],
    accessors: FilterAccessors<T>,
    searchParts?: SearchParts<T>,
  ) => Map<string, number>;
  /** O'sha sanoq, ma'lumotdan variant ro'yxati yasaladigan joylar uchun. */
  facets: (
    column: string,
    rows: readonly T[],
    accessors: FilterAccessors<T>,
    searchParts?: SearchParts<T>,
  ) => FacetCount[];
}

const NO_VALUES: readonly string[] = [];
const EMPTY_BUCKET: readonly string[] = [""];

/** Qator qiymatlarini bir xil ko'rinishga keltiradi (`null` → `[""]`). */
function valuesOf<T>(row: T, accessor: FilterAccessor<T>): readonly string[] {
  const v = accessor(row);
  if (v === null || v === undefined) return EMPTY_BUCKET;
  if (typeof v === "string") return [v];
  return v.length > 0 ? v : EMPTY_BUCKET;
}

function passesColumn<T>(row: T, accessor: FilterAccessor<T>, selected: readonly string[]): boolean {
  if (selected.length === 0) return true;
  return valuesOf(row, accessor).some((v) => selected.includes(v));
}

function passesQuery<T>(row: T, query: string, searchParts: SearchParts<T> | undefined): boolean {
  // Qidiruv qismlari berilmagan bo'lsa, sahifa matn qidiruvidan voz kechgan —
  // so'rov jimgina hamma qatorni o'chirib yubormasligi kerak.
  if (!searchParts) return true;
  return matchesQuery(searchParts(row), query);
}

/** Bitta qator barcha (yoki `skip`dan boshqa) ustun filtrlaridan o'tadimi. */
function passesAll<T>(
  row: T,
  accessors: FilterAccessors<T>,
  filters: FilterValues,
  skip?: string,
): boolean {
  for (const column of Object.keys(accessors)) {
    if (column === skip) continue;
    if (!passesColumn(row, accessors[column], filters[column] ?? NO_VALUES)) return false;
  }
  return true;
}

interface ApplyCache<T> {
  rows: readonly T[];
  accessors: FilterAccessors<T>;
  searchParts: SearchParts<T> | undefined;
  filters: FilterValues;
  query: string;
  result: T[];
}

/**
 * @param initial boshlang'ich tanlovlar (masalan URL'dan kelgan deep link).
 */
export function useListFilters<T>(initial: FilterValues = {}): ListFilters<T> {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterValues>(initial);

  const setFilter = useCallback((column: string, values: readonly string[]) => {
    setFilters((prev) => {
      // Bo'sh tanlov kalitni butunlay olib tashlaydi — shunda `activeCount`
      // va chip'lar "tozalangan" filtrni faol deb sanamaydi.
      if (values.length === 0) {
        if (!(column in prev)) return prev;
        const next = { ...prev };
        delete next[column];
        return next;
      }
      return { ...prev, [column]: values };
    });
  }, []);

  const clearFilter = useCallback((column: string) => setFilter(column, NO_VALUES), [setFilter]);

  const clearAll = useCallback(() => {
    setFilters({});
    setQuery("");
  }, []);

  const selected = useCallback(
    (column: string): readonly string[] => filters[column] ?? NO_VALUES,
    [filters],
  );

  const activeCount = useMemo(
    () => Object.values(filters).filter((v) => v.length > 0).length,
    [filters],
  );

  // Natija keshi ref'da: `apply` argumentlari chaqiruvchidan keladi, shuning
  // uchun uni `useMemo` bilan yopib bo'lmaydi. Kesh sof — bir xil kirish
  // uchun bir xil chiqish, shuning uchun qayta render xavfsiz. To'liq foyda
  // olish uchun `accessors` va `searchParts` barqaror bo'lsin (modul
  // darajasidagi const yoki `useMemo`), aks holda har render'da qayta
  // hisoblanadi — natija baribir to'g'ri.
  const cacheRef = useRef<ApplyCache<T> | null>(null);

  const apply = useCallback(
    (rows: readonly T[], accessors: FilterAccessors<T>, searchParts?: SearchParts<T>): T[] => {
      const hit = cacheRef.current;
      if (
        hit &&
        hit.rows === rows &&
        hit.accessors === accessors &&
        hit.searchParts === searchParts &&
        hit.filters === filters &&
        hit.query === query
      ) {
        return hit.result;
      }

      const result = rows.filter(
        (row) => passesQuery(row, query, searchParts) && passesAll(row, accessors, filters),
      );
      cacheRef.current = { rows, accessors, searchParts, filters, query, result };
      return result;
    },
    [filters, query],
  );

  const facetCounts = useCallback(
    (
      column: string,
      rows: readonly T[],
      accessors: FilterAccessors<T>,
      searchParts?: SearchParts<T>,
    ): Map<string, number> => {
      const counts = new Map<string, number>();
      // Ustun ro'yxatda bo'lmasligi mumkin (yashirilgan ustun) — tur bo'yicha
      // ham `undefined` deb belgilanadi, aks holda tekshiruv o'lik kod bo'lardi.
      const accessor: FilterAccessor<T> | undefined = accessors[column];
      if (!accessor) return counts;

      // Sanoq QOLGAN filtrlardan o'tgan qatorlar bo'yicha: o'z filtri hisobga
      // olinsa, tanlanmagan variantlarning hammasi 0 bo'lib qolardi va
      // foydalanuvchi tanlovini kengaytira olmasdi.
      for (const row of rows) {
        if (!passesQuery(row, query, searchParts)) continue;
        if (!passesAll(row, accessors, filters, column)) continue;
        for (const v of valuesOf(row, accessor)) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      return counts;
    },
    [filters, query],
  );

  const facets = useCallback(
    (
      column: string,
      rows: readonly T[],
      accessors: FilterAccessors<T>,
      searchParts?: SearchParts<T>,
    ): FacetCount[] =>
      [...facetCounts(column, rows, accessors, searchParts)]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value)),
    [facetCounts],
  );

  return {
    query,
    setQuery,
    filters,
    selected,
    setFilter,
    clearFilter,
    clearAll,
    activeCount,
    isFiltered: activeCount > 0 || query.trim() !== "",
    apply,
    facetCounts,
    facets,
  };
}

// ---------------------------------------------------------------------------
// FilterDrawer uchun qoralama/qo'llangan juftligi.
// ---------------------------------------------------------------------------

/** Bitta filtr sifatida sanaladigan maydonlar (masalan sana "from"/"to"). */
export type FilterPairs<T> = readonly (readonly [keyof T & string, keyof T & string])[];

export interface DraftFilters<T extends Record<string, string>> {
  /** Jadvalga qo'llangan holat. */
  filters: T;
  /** Panel ichida tahrirlanayotgan holat. */
  draft: T;
  setDraft: (patch: Partial<T>) => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  apply: () => void;
  clear: () => void;
  activeCount: number;
  /** Panel sarlavhasidagi hisob — qoralama bo'yicha. */
  draftActiveCount: number;
}

function countActive<T extends Record<string, string>>(values: T, pairs: FilterPairs<T>): number {
  const paired = new Set<string>();
  let count = 0;
  for (const [a, b] of pairs) {
    paired.add(a);
    paired.add(b);
    if (values[a] !== "" || values[b] !== "") count++;
  }
  for (const key of Object.keys(values)) {
    if (!paired.has(key) && values[key] !== "") count++;
  }
  return count;
}

/**
 * `empty` — "hech narsa tanlanmagan" holat (barcha qiymatlar bo'sh string).
 * `pairs` — sana oraliqlari: "from" va "to" birgalikda bitta filtr sifatida
 * sanaladi, aks holda bitta sana oralig'i badge'da "2" ko'rsatardi.
 */
export function useDraftFilters<T extends Record<string, string>>(
  empty: T,
  options?: { pairs?: FilterPairs<T> },
): DraftFilters<T> {
  const pairs: FilterPairs<T> = options?.pairs ?? [];

  // `empty` chaqiruvchida modul darajasidagi const bo'lishi kutiladi, lekin
  // qator ichida yozilsa har render'da yangi obyekt bo'ladi. Uni bog'liqlikka
  // qo'yish o'rniga eng oxirgi qiymat ref'da saqlanadi — shunda "Clear"
  // har doim joriy ta'rifga qaytaradi va hech bir effekt qayta ishga tushmaydi.
  const emptyRef = useRef(empty);
  useEffect(() => {
    emptyRef.current = empty;
  }, [empty]);

  const [filters, setFilters] = useState<T>(empty);
  const [draft, setDraftState] = useState<T>(empty);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const setDraft = useCallback((patch: Partial<T>) => {
    setDraftState((prev) => ({ ...prev, ...patch }));
  }, []);

  // Panel ochilganda qoralama qo'llangan holatdan boshlanadi — aks holda
  // yopib qayta ochgan foydalanuvchi tashlab yuborilgan qoralamani ko'rardi.
  const openDrawer = useCallback(() => {
    setDraftState(filters);
    setDrawerOpen(true);
  }, [filters]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const apply = useCallback(() => {
    setFilters(draft);
    setDrawerOpen(false);
  }, [draft]);

  // "Clear" ikkalasini ham tozalaydi. Ilgari faqat qoralama tozalanardi va
  // "Clear" bosgan foydalanuvchi uchun jadval Apply bosilmaguncha o'zgarmasdi.
  const clear = useCallback(() => {
    setDraftState(emptyRef.current);
    setFilters(emptyRef.current);
  }, []);

  return {
    filters,
    draft,
    setDraft,
    drawerOpen,
    openDrawer,
    closeDrawer,
    apply,
    clear,
    activeCount: countActive(filters, pairs),
    draftActiveCount: countActive(draft, pairs),
  };
}
