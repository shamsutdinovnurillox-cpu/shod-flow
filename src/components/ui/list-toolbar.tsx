"use client";

import React, { useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterButton } from "@/components/ui/filter-drawer";

// ============================================================================
// Jadval ustidagi qator: qidiruv + filtr tugmasi + o'ng tarafdagi amallar,
// ostida esa faol filtrlar chiplari.
//
// Har bir ro'yxat sahifasi bu qatorni o'zicha yozgan edi — kimdir ikonkasiz,
// kimdir tozalash tugmasisiz, sinf satrlari esa hech qayerda mos kelmasdi.
// Bu yerda hech qanday effekt yo'q: butun holat chaqiruvchida, shuning uchun
// har bosilgan tugmada yangidan yaraladigan callback'lar hech narsani qayta
// ishga tushirmaydi va inputdan fokus o'g'irlanmaydi.
// ============================================================================

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Ko'rinmas yorliq — input yonida matnli `<label>` bo'lmaydi. */
  label?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  label = "Search",
  className,
}: SearchInputProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = () => {
    onChange("");
    // Tozalash tugmasi qidiruvdan chiqib ketmasligi kerak — foydalanuvchi
    // odatda darhol yangi so'rov yozadi.
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Escape" || value === "") return;
    // Esc qidiruvni tozalaydi. Hodisa yuqoriga uzatilmaydi — aks holda
    // qidiruv modal yoki panel ichida bo'lsa, o'sha ham yopilib ketardi.
    e.stopPropagation();
    clear();
  };

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={label}
        className={cn("input pl-9", value !== "" && "pr-10")}
      />
      {value !== "" && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          title="Clear search"
          className="btn btn-ghost btn-icon absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export interface FilterChip {
  /** Olib tashlashda qaytariladigan kalit — odatda ustun nomi. */
  key: string;
  /** Nima bo'yicha filtr ("Status"). */
  label: string;
  /** Tanlangan qiymat ("Active, On Leave"). */
  value?: string;
}

export interface ActiveFilterChipsProps {
  chips: readonly FilterChip[];
  onRemove: (key: string) => void;
  onClearAll?: () => void;
  className?: string;
}

/** Faol filtrlar — bittalab yoki hammasi birdan olib tashlanadi. */
export function ActiveFilterChips({
  chips,
  onRemove,
  onClearAll,
  className,
}: ActiveFilterChipsProps): React.ReactElement | null {
  if (chips.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Active filters"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {chips.map((chip) => (
        <span key={chip.key} className="badge badge-primary py-1 pl-2.5 pr-1">
          <span className="max-w-[16rem] truncate">
            {chip.label}
            {chip.value !== undefined && chip.value !== "" && (
              <span className="font-normal">: {chip.value}</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => onRemove(chip.key)}
            aria-label={`Remove filter: ${chip.label}`}
            className="grid h-4 w-4 place-items-center rounded-full text-current opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {onClearAll && (
        <button type="button" onClick={onClearAll} className="btn btn-ghost btn-sm text-muted">
          Clear all
        </button>
      )}
    </div>
  );
}

export interface ListToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  searchLabel?: string;
  /** Berilsa — `FilterButton` chiziladi (badge shu sondan). */
  activeCount?: number;
  onFilterClick?: () => void;
  chips?: readonly FilterChip[];
  /** Chip'lar faqat shu bilan birga chiziladi — olib tashlab bo'lmaydigan chip yaramaydi. */
  onRemoveChip?: (key: string) => void;
  onClearAll?: () => void;
  className?: string;
  /** O'ng tarafdagi amallar: Add, Export, ko'rinish tanlagichi. */
  children?: React.ReactNode;
}

export function ListToolbar({
  search,
  onSearch,
  placeholder,
  searchLabel,
  activeCount = 0,
  onFilterClick,
  chips,
  onRemoveChip,
  onClearAll,
  className,
  children,
}: ListToolbarProps): React.ReactElement {
  const showChips = Boolean(chips && chips.length > 0 && onRemoveChip);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={onSearch}
          placeholder={placeholder}
          label={searchLabel}
          className="min-w-[12rem] flex-1 sm:max-w-sm"
        />
        {onFilterClick && <FilterButton activeCount={activeCount} onClick={onFilterClick} />}
        {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
      </div>

      {showChips && chips && onRemoveChip && (
        <ActiveFilterChips chips={chips} onRemove={onRemoveChip} onClearAll={onClearAll} />
      )}
    </div>
  );
}
