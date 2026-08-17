"use client";

import React, { useEffect, useId, useRef } from "react";
import { Field } from "@/components/ui/profile";
import { cn } from "@/lib/utils";
import {
  clearedPatch,
  fieldValue,
  isHalfWidth,
  type FieldMode,
  type FieldSpec,
  type FieldValue,
} from "@/lib/field-spec";

// ============================================================================
// `FieldSpec[]` ni formaga chizuvchi qatlam.
//
// Qoidalarning o'zi `@/lib/field-spec` da (React'siz), chunki server action
// ham xuddi shu matritsani import qiladi. Bu fayl faqat ko'rinish bilan
// shug'ullanadi: mavjud `Field` + `.modal-input` markup'i va ikki ustunli to'r.
//
// Qiymatlar `ServiceFormFields` dagi kabi bitta `onChange(patch)` orqali
// boshqariladi — ota-ona holatni o'zi saqlaydi, bu yerda hech qanday nusxa yo'q.
// ============================================================================

/** Ajratgich: maydon nomlari JS identifikatorlari, ularda bo'shliq uchramaydi. */
const SEP = " ";

/** `renderControl` ga uzatiladigan kontekst. */
export interface FieldControlContext {
  /** `id` — bitta formada bir necha nusxa bo'lsa ham takrorlanmaydi. */
  id: string;
  /** Joriy qiymat, input uchun stringga keltirilgan. */
  value: string;
  disabled: boolean;
  onValue: (next: string) => void;
}

export interface ConditionalFieldsProps<TValues extends object> {
  /** `resolveSpec` / `SpecResolver` qaytargan ko'rinadigan maydonlar. */
  fields: readonly FieldSpec<TValues>[];
  values: TValues;
  /** Faqat o'zgargan maydonni uzatadi — ota-ona uni holatiga qo'shadi. */
  onChange: (patch: Partial<TValues>) => void;
  /** Butun blokni bloklash (saqlanayotganda). */
  disabled?: boolean;
  className?: string;
  /**
   * Maydon spec'dan yo'qolganda qiymatini ham bo'shatish. Default — yoqilgan:
   * aks holda foydalanuvchi turini almashtirib qaytarsa, ekranda ko'rinmagan
   * eski qiymat qayta paydo bo'ladi. Saqlashdan oldingi yakuniy kafolat
   * baribir `visibleValues` / `clearHidden` da.
   */
  clearOnHide?: boolean;
  /**
   * Standart boshqaruv o'rniga o'zinikini chizish (entity select, state
   * select kabi). `undefined` qaytsa — standart boshqaruv ishlatiladi;
   * `null` qaytsa — hech narsa chizilmaydi.
   */
  renderControl?: (field: FieldSpec<TValues>, ctx: FieldControlContext) => React.ReactNode;
}

/** Input uchun qiymatni stringga keltirish (`null` → bo'sh, tanlanmagan). */
function toInputValue(value: FieldValue): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
}

function defaultControl<TValues extends object>(
  field: FieldSpec<TValues>,
  ctx: FieldControlContext,
): React.ReactElement {
  // `Field` ning `<label>` i `htmlFor` qabul qilmaydi (profile.tsx umumiy
  // fayl, unga tegilmaydi) — shuning uchun har bir boshqaruv o'z nomini
  // `aria-label` orqali oladi, aks holda skrin-riderda nomsiz qolardi.
  //
  // Native `required` ataylab qo'yilmaydi: brauzerning o'z xabari inglizcha
  // chiqadi va `validateSpec` ning o'zbekcha matnini bosib ketardi. Talab
  // yorliqdagi `*` va `aria-required` orqali bildiriladi.
  const common = {
    id: ctx.id,
    "aria-label": field.label,
    "aria-required": field.required ? true : undefined,
    className: "modal-input",
    disabled: ctx.disabled,
    value: ctx.value,
  } as const;

  switch (field.kind) {
    case "textarea":
      return (
        <textarea
          {...common}
          rows={field.rows ?? 3}
          placeholder={field.placeholder}
          onChange={(e) => ctx.onValue(e.target.value)}
        />
      );

    case "select": {
      const options = field.options ?? [];
      // Eski yozuvda vocabulary'ga kirmaydigan qiymat bo'lishi mumkin. Uni
      // variant sifatida qo'shmasak, tahrirlash oynasi ochilganda select
      // birinchi variantga "sirg'alib", saqlashda qiymat jimgina almashardi.
      const legacy = ctx.value !== "" && !options.some((o) => o.value === ctx.value);
      return (
        <select {...common} onChange={(e) => ctx.onValue(e.target.value)}>
          <option value="">{field.placeholder ?? "Select…"}</option>
          {legacy && <option value={ctx.value}>{ctx.value} (legacy)</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }

    case "date":
      return <input {...common} type="date" onChange={(e) => ctx.onValue(e.target.value)} />;

    case "time":
      return <input {...common} type="time" onChange={(e) => ctx.onValue(e.target.value)} />;

    case "number":
      return (
        <input
          {...common}
          type="number"
          step={field.step ?? 1}
          min={field.min}
          max={field.max}
          placeholder={field.placeholder}
          onChange={(e) => ctx.onValue(e.target.value)}
        />
      );

    case "money":
      // Valyuta belgisi yorliqda turadi ("Cost ($)") — repodagi mavjud
      // formalar shunday, alohida adornment markup'i kiritilmaydi.
      return (
        <input
          {...common}
          type="number"
          inputMode="decimal"
          step={field.step ?? "0.01"}
          min={field.min}
          max={field.max}
          placeholder={field.placeholder}
          onChange={(e) => ctx.onValue(e.target.value)}
        />
      );

    default:
      return (
        <input
          {...common}
          type="text"
          placeholder={field.placeholder}
          onChange={(e) => ctx.onValue(e.target.value)}
        />
      );
  }
}

export function ConditionalFields<TValues extends object>({
  fields,
  values,
  onChange,
  disabled = false,
  className,
  clearOnHide = true,
  renderControl,
}: ConditionalFieldsProps<TValues>) {
  const uid = useId();

  // `onChange` va `values` odatda har render'da yangi bo'ladi (ota-ona
  // `(patch) => setForm({ ...form, ...patch })` deb yozadi). Ularni quyidagi
  // effektning bog'liqligiga qo'ysak, effekt har bosilgan tugmada qayta ishga
  // tushardi. Shuning uchun eng oxirgi qiymat ref'da saqlanadi — modal.tsx:47
  // dagi bilan bir xil naqsh.
  const onChangeRef = useRef(onChange);
  const valuesRef = useRef(values);
  useEffect(() => {
    onChangeRef.current = onChange;
    valuesRef.current = values;
  });

  // Effekt faqat ko'rinadigan maydonlar to'plami o'zgarganda ishlashi kerak;
  // massivning o'zi har render'da yangi bo'lgani uchun barqaror satr kalit.
  const visibleKey = fields.map((f) => f.name).join(SEP);
  const prevKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevKeyRef.current;
    prevKeyRef.current = visibleKey;
    // Birinchi render — tozalanadigan narsa yo'q. Bu, ayniqsa, tahrirlash
    // oynasi uchun muhim: mavjud yozuvning qiymatlari o'chib ketmasin.
    if (prev === null || prev === visibleKey || !clearOnHide) return;

    const current = new Set(visibleKey.split(SEP));
    const gone = prev.split(SEP).filter((name) => name !== "" && !current.has(name));
    if (gone.length === 0) return;

    const patch = clearedPatch<TValues>(gone, valuesRef.current);
    if (Object.keys(patch).length > 0) onChangeRef.current(patch);
  }, [visibleKey, clearOnHide]);

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {fields.map((field) => {
        const ctx: FieldControlContext = {
          id: `${uid}-${field.name}`,
          value: toInputValue(fieldValue(values, field.name)),
          disabled: disabled || field.disabled === true,
          onValue: (next) => onChange(patchOf<TValues>(field.name, next)),
        };
        const custom = renderControl?.(field, ctx);

        return (
          <Field
            key={field.name}
            label={field.required ? `${field.label} *` : field.label}
            hint={field.hint}
            className={cn(!isHalfWidth(field) && "sm:col-span-2")}
          >
            {custom === undefined ? defaultControl(field, ctx) : custom}
          </Field>
        );
      })}
    </div>
  );
}

/** Bitta maydonlik patch — hisoblangan kalit bilan tipni saqlab qurish. */
function patchOf<TValues extends object>(name: string, value: string): Partial<TValues> {
  const patch: Record<string, string> = {};
  patch[name] = value;
  return patch as unknown as Partial<TValues>;
}

export interface SpecFieldProps {
  mode: FieldMode;
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Bitta maydonni rejim bo'yicha o'rash — boshqaruv `FieldKind` ga sig'maganda
 * (checkbox, fayl yuklash, entity picker) `ConditionalFields` o'rniga shu
 * ishlatiladi. "hidden" bo'lsa hech narsa chizilmaydi, "required" bo'lsa
 * yorliqqa `*` qo'shiladi.
 */
export function SpecField({
  mode,
  label,
  hint,
  className,
  children,
}: SpecFieldProps): React.ReactElement | null {
  if (mode === "hidden") return null;
  return (
    <Field label={mode === "required" ? `${label} *` : label} hint={hint} className={className}>
      {children}
    </Field>
  );
}
