"use client";

import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ListFilter, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Ustun sarlavhasi ichidagi ko'p tanlovli filtr.
//
// Nega portal: har bir jadval `overflow-x-auto` konteyner ichida turadi, CSS
// esa `overflow-x: auto` bo'lganda `overflow-y` ni ham `auto` deb hisoblaydi —
// ya'ni absolyut joylashgan popover jadval chekkasida qirqiladi. Shuning uchun
// ro'yxat `document.body` ga portal qilinadi va `position: fixed` bilan
// getBoundingClientRect() koordinatalariga qo'yiladi; scroll (capture bilan,
// ota konteyner scroll'i ham hisobga olinsin) va resize'da qayta o'lchanadi.
//
// `z-40` ataylab: Modal va FilterDrawer z-50 da, ular doim tepada qolishi kerak.
//
// Komponent <th> ni o'zi chizmaydi — mavjud <th> ichiga qo'yiladi, shuning
// uchun jadval markup'i va colSpan hisobi o'zgarmaydi.
// ============================================================================

export interface ColumnFilterOption {
  value: string;
  label: string;
  /** Shu variantga to'g'ri keladigan qatorlar soni (facet). */
  count?: number;
}

export interface ColumnFilterHeaderProps {
  label: string;
  // `readonly`: variant ro'yxatlari `enum-options.ts` da `readonly EnumOption[]`
  // deb e'lon qilingan, tanlov esa `useListFilters().selected()` dan
  // `readonly string[]` bo'lib keladi. O'zgaruvchan massiv talab qilinsa,
  // har bir chaqiruv joyida ortiqcha nusxa olishga majbur bo'lardik.
  options: readonly ColumnFilterOption[];
  /** Bo'sh massiv = barchasi (filtr o'chirilgan). */
  selected: readonly string[];
  onChange: (next: string[]) => void;
  /** Ichki qidiruv maydoni (masalan 52 ta shtat). 12+ variantda o'zi yoqiladi. */
  searchable?: boolean;
  /** Raqamli/o'ngga tekislangan ustunlar uchun "end". */
  align?: "start" | "end";
}

/** Ichki qidiruv shu chegaradan boshlab avtomatik chiqadi. */
const AUTO_SEARCH_AT = 12;

const subscribeNever = () => () => {};
const alwaysTrue = () => true;
const alwaysFalse = () => false;

/**
 * Serverda `false`, hydration'dan keyin `true`. `useEffect` + `setState`
 * o'rniga tashqi manba — expiry.tsx'dagi `useDayStart` bilan bir xil naqsh
 * (React Compiler effekt ichida setState'ni taqiqlaydi).
 */
function useMounted(): boolean {
  return useSyncExternalStore(subscribeNever, alwaysTrue, alwaysFalse);
}

const GAP = 4;
const EDGE = 8;
const MIN_MENU = 208;
const MAX_MENU = 288;
const MAX_POPOVER_H = 336;
const MIN_POPOVER_H = 168;

interface PopoverPos {
  left: number;
  /** `top` yoki `bottom` dan faqat bittasi bo'ladi — pastda joy yetmasa yuqoriga ochiladi. */
  top?: number;
  bottom?: number;
  width: number;
  maxHeight: number;
}

/**
 * Popover koordinatalari. Yuqoriga ochilganda `bottom` ishlatiladi: shunda
 * ro'yxat balandligini oldindan o'lchash shart emas (o'lchash uchun avval
 * chizish kerak bo'lardi — bu esa ko'zga tashlanadigan sakrash beradi).
 */
function computePos(anchor: HTMLElement, align: "start" | "end"): PopoverPos {
  const r = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const width = Math.min(MAX_MENU, Math.max(MIN_MENU, Math.round(r.width) + 24));
  const rawLeft = align === "end" ? r.right - width : r.left;
  const left = Math.round(Math.min(Math.max(EDGE, rawLeft), Math.max(EDGE, vw - width - EDGE)));

  const below = vh - r.bottom - GAP - EDGE;
  const above = r.top - GAP - EDGE;

  if (below < MIN_POPOVER_H && above > below) {
    return {
      left,
      bottom: Math.round(Math.max(EDGE, vh - r.top + GAP)),
      width,
      maxHeight: Math.max(MIN_POPOVER_H, Math.min(MAX_POPOVER_H, above)),
    };
  }
  return {
    left,
    top: Math.round(r.bottom + GAP),
    width,
    maxHeight: Math.max(MIN_POPOVER_H, Math.min(MAX_POPOVER_H, below)),
  };
}

interface PopoverRow {
  /** `null` — "All" qatori (filtrni tozalaydi). */
  value: string | null;
  label: string;
  count?: number;
}

interface FilterPopoverProps {
  anchor: HTMLElement;
  label: string;
  options: readonly ColumnFilterOption[];
  selected: readonly string[];
  showSearch: boolean;
  align: "start" | "end";
  onChange: (next: string[]) => void;
  onClose: () => void;
}

function FilterPopover({
  anchor,
  label,
  options,
  selected,
  showSearch,
  align,
  onChange,
  onClose,
}: FilterPopoverProps) {
  // Boshlang'ich holat darhol to'g'ri joyda chiqishi uchun render paytida
  // hisoblanadi — anchor DOM'da allaqachon bor (popover faqat bosilgandan
  // keyin mount bo'ladi), shuning uchun bu SSR'ga tegmaydi.
  const [pos, setPos] = useState<PopoverPos>(() => computePos(anchor, align));
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  // `onClose` ota komponentda har render'da qaytadan yaratiladi. Uni quyidagi
  // effekt bog'liqligiga qo'ysak, hujjat listener'lari har bosilishda qayta
  // ulanardi. Shuning uchun eng oxirgi qiymat ref'da saqlanadi (Modal'dagi
  // bilan bir xil naqsh) va effekt faqat mount'da ishlaydi.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const rows = useMemo<PopoverRow[]>(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
      : options;
    const list: PopoverRow[] = matched.map((o) => ({ value: o.value, label: o.label, count: o.count }));
    // "All" qidiruv natijasi emas — qidiruv yozilganda ro'yxatdan chiqadi.
    return q ? list : [{ value: null, label: "All" }, ...list];
  }, [options, query]);

  // Qidiruv ro'yxatni qisqartirganda eski indeks chegaradan chiqib ketishi mumkin.
  const activeIndex = active < rows.length ? active : 0;

  // Popover joyi: listener'lar bir marta ulanadi, `anchor`/`align` esa barqaror
  // qiymatlar — har bosilishda qayta ulanish bo'lmaydi.
  useLayoutEffect(() => {
    const update = () => setPos(computePos(anchor, align));
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchor, align]);

  // Fokus faqat ochilishda (foydalanuvchi harakati bilan) ichkariga o'tadi —
  // mount'da bir marta, keyingi render'larda emas.
  useEffect(() => {
    (searchRef.current ?? listRef.current)?.focus({ preventScroll: true });
  }, []);

  // Tashqariga bosish va Escape. `pointerdown` capture bosqichida: jadval
  // ichidagi boshqa boshqaruvlar propagation'ni to'xtatsa ham yopilishi kerak.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      anchor.focus();
      onCloseRef.current();
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      // Anchor'ning o'zi — click hodisasi filtrni yopadi, bu yerda tegmaymiz
      // (aks holda yopilib darhol qayta ochilardi).
      if (anchor.contains(target) || rootRef.current?.contains(target)) return;
      onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [anchor]);

  // Klaviatura bilan yurilganda faol qator ko'rinib tursin ("nearest" — sahifa
  // emas, faqat ro'yxatning o'zi suriladi).
  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const close = () => {
    anchor.focus();
    onClose();
  };

  const toggle = (value: string | null) => {
    if (value === null) {
      onChange([]);
      return;
    }
    onChange(selectedSet.has(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // React portal hodisalari DOM daraxti bo'ylab emas, React daraxti bo'ylab
    // ko'tariladi — ya'ni bu klavishlar <th>/<tr> dagi qator ochish
    // ishlov beruvchisiga yetib borardi. Shu yerda to'xtatiladi.
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "Tab") {
      // Fokus popover'dan chiqib ketmoqda — ochiq qoldirishning ma'nosi yo'q.
      onClose();
      return;
    }
    if (rows.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1 >= rows.length ? 0 : i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 < 0 ? rows.length - 1 : i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(rows.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[activeIndex];
      if (row) toggle(row.value);
    }
  };

  return (
    <div
      ref={rootRef}
      onKeyDown={onKeyDown}
      onClick={(e) => e.stopPropagation()}
      style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width, maxHeight: pos.maxHeight }}
      className="fixed z-40 flex animate-scale-in flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-lg)]"
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="btn btn-ghost btn-sm h-6 px-1.5 text-xs font-semibold text-primary"
          >
            Clear
          </button>
        )}
      </div>

      {showSearch && (
        <div className="relative border-b border-border p-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search…"
            aria-label={`Search ${label} options`}
            aria-controls={listId}
            aria-activedescendant={rows[activeIndex] ? optionId(activeIndex) : undefined}
            className="input h-8 py-1 pl-7 text-sm"
          />
        </div>
      )}

      <div
        id={listId}
        ref={listRef}
        role="listbox"
        aria-multiselectable
        aria-label={label}
        aria-activedescendant={!showSearch && rows[activeIndex] ? optionId(activeIndex) : undefined}
        tabIndex={-1}
        className="min-h-0 flex-1 overflow-y-auto py-1 outline-none"
      >
        {rows.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted">No matches</p>
        ) : (
          rows.map((row, i) => {
            const checked = row.value === null ? selected.length === 0 : selectedSet.has(row.value);
            return (
              <div
                key={row.value ?? "__all__"}
                id={optionId(i)}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                role="option"
                aria-selected={checked}
                onClick={() => toggle(row.value)}
                onPointerEnter={() => setActive(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 px-2.5 py-1.5 text-sm text-fg",
                  i === activeIndex && "bg-surface-2",
                  row.value === null && "border-b border-border/60",
                )}
              >
                <span
                  className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded border",
                    checked ? "border-primary bg-primary text-primary-fg" : "border-border-strong",
                  )}
                >
                  {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 truncate normal-case tracking-normal">{row.label}</span>
                {row.count !== undefined && (
                  <span className="shrink-0 text-xs tabular-nums text-faint">{row.count}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ColumnFilterHeader({
  label,
  options,
  selected,
  onChange,
  searchable = false,
  align = "start",
}: ColumnFilterHeaderProps) {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  // SSR'da `document` yo'q — portal faqat hydration'dan keyin chiziladi.
  const mounted = useMounted();

  // Next 16 `<Activity>` sahifa holatini saqlaydi: orqaga qaytilganda ochiq
  // qolgan popover "o'zicha ochilgan" bo'lib ko'rinardi. Yashirilishdan oldin
  // sinxron yopiladi (docs: 02-guides/preserving-ui-state).
  useLayoutEffect(() => () => setOpen(false), []);

  const isFiltered = selected.length > 0;
  const showSearch = searchable || options.length >= AUTO_SEARCH_AT;

  return (
    <span className={cn("flex w-full items-center", align === "end" ? "justify-end" : "justify-start")}>
      <button
        ref={setAnchorEl}
        type="button"
        onClick={(e) => {
          // Sarlavhaga keyinchalik saralash qo'shilsa, filtr tugmasi uni
          // ishga tushirmasligi kerak.
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={
          isFiltered
            ? `Filter by ${label}, ${selected.length} selected`
            : `Filter by ${label}`
        }
        className={cn(
          "-mx-1 inline-flex max-w-full items-center gap-1.5 rounded-md px-1 py-0.5",
          "text-xs font-semibold uppercase tracking-wide transition-colors hover:text-fg",
          isFiltered ? "text-primary" : "text-muted",
        )}
      >
        <span className="truncate">{label}</span>
        {isFiltered && (
          <span className="badge badge-primary h-4 px-1.5 text-[10px] tabular-nums">{selected.length}</span>
        )}
        {isFiltered ? (
          <ListFilter className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
        )}
      </button>

      {mounted &&
        open &&
        anchorEl &&
        createPortal(
          <FilterPopover
            anchor={anchorEl}
            label={label}
            options={options}
            selected={selected}
            showSearch={showSearch}
            align={align}
            onChange={onChange}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )}
    </span>
  );
}
