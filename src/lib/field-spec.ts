// ============================================================================
// Shartli maydonlar dvigateli — sof ma'lumot va sof funksiyalar, React yo'q.
//
// Nega alohida fayl: "qaysi maydon ko'rinadi va qaysi biri majburiy" qoidasi
// bir vaqtning o'zida client formaga ham, server action'ga ham kerak. Ikki
// joyda qo'lda yozilsa ular muqarrar bir-biridan ajralib ketadi, va brauzer
// o'tkazmagan yozuv to'g'ridan-to'g'ri action chaqiruvi orqali bazaga tushadi.
// Shuning uchun matritsa shu yerda bir marta e'lon qilinadi, ikkala tomon esa
// uni import qilib bir xil `validateSpec` / `visibleValues` ni chaqiradi.
//
// Uchta iste'molchi bitta dvigatelga mo'ljallangan:
//   Claims       — claim turi (Trailer Interchange / P·D / Liability / OCAC)
//                  qaysi maydonlar chiqishini va majburiyligini hal qiladi;
//   Inspections  — status Clean bo'lsa Bonus, Violation / DQ Cleared bo'lsa
//                  Penalty ko'rinadi (ikkalasi hech qachon birga emas);
//   PM/DOT       — In Queue'da deyarli hammasi ixtiyoriy, Scheduled'da
//                  Location/Agent/Date/Time, Completed'da bularga qo'shimcha
//                  Completion Mileage majburiy.
//
// Tipik ishlatilish:
//
//   const CLAIM_RULES: FieldRule<ClaimForm>[] = [
//     { name: "type",       label: "Claim Type", kind: "select", required: true, options: CLAIM_TYPE_OPTIONS },
//     { name: "loadNumber", label: "Load Number", kind: "text",
//       visible: whenValue("type", "CARGO"), required: whenValue("type", "CARGO") },
//   ];
//   const claimSpec = specResolver(CLAIM_RULES);   // forma ham, action ham shuni chaqiradi
//
//   const fields = claimSpec(values);
//   const err = validateSpec(fields, values);      // birinchi xato, o'zbekcha
//   const payload = visibleValues(fields, values); // yashirin maydon payload'ga tushmaydi
// ============================================================================

/** Boshqaruv turi — `conditional-fields.tsx` shu asosda input tanlaydi. */
export type FieldKind = "text" | "number" | "date" | "time" | "textarea" | "select" | "money";

/**
 * Forma holatidagi bitta qiymat. Repodagi formalar `Record<string, string>`
 * ko'rinishida (`<input>` doim string qaytaradi), lekin server tomondan
 * kelgan yozuvda son yoki `null` ham bo'lishi mumkin — shuning uchun kengroq.
 */
export type FieldValue = string | number | boolean | null | undefined;

/** Nomlangan tipi bo'lmagan forma holati uchun standart shakl. */
export type SpecValues = Record<string, FieldValue>;

/**
 * Forma holatidagi maydon nomi. `TValues` ataylab `object` bilan cheklangan:
 * repodagi forma holatlari `interface` sifatida e'lon qilingan
 * (`ServiceFormValues`), TS esa interfeyslarga yashirin index signature
 * bermaydi — `Record<string, …>` cheklovi ularni ishlatib bo'lmaydigan qilardi.
 */
export type FieldName<TValues extends object> = Extract<keyof TValues, string>;

export interface FieldOption {
  value: string;
  label: string;
}

/** Hisoblab chiqilgan (ko'rinadigan) bitta maydon tavsifi. */
export interface FieldSpec<TValues extends object = SpecValues> {
  name: FieldName<TValues>;
  label: string;
  kind: FieldKind;
  /** `resolveSpec` dan keyin bu doim aniq boolean bo'ladi. */
  required?: boolean;
  /** `kind: "select"` uchun variantlar. */
  options?: readonly FieldOption[];
  /** Matn maydonlarida placeholder, select'da bo'sh variant yorlig'i. */
  placeholder?: string;
  /** Maydon ostidagi kichik izoh (`Field` ning `hint` i). */
  hint?: string;
  /**
   * Ikki ustunli to'rdagi kengligi. Berilmasa: textarea butun qatorni oladi,
   * qolganlari yarim ustun — repodagi mavjud formalar shunday ko'rinadi.
   */
  halfWidth?: boolean;
  disabled?: boolean;
  /** number / money uchun chegaralar — `validateSpec` ham shularni tekshiradi. */
  min?: number;
  max?: number;
  step?: number | string;
  /** textarea balandligi. */
  rows?: number;
  /**
   * `options` dan tashqaridagi qiymat rad etilsin. Default — yo'q: eski
   * yozuvlarda vocabulary'ga kirmaydigan qiymatlar bor (shu sababli
   * `PresetSelect` legacy variantni chizadi), va ularni tahrirlashda
   * saqlash imkonsiz bo'lib qolmasligi kerak.
   */
  strictOptions?: boolean;
  /**
   * Maydonga xos qo'shimcha tekshiruv — masalan maydonlararo qoida
   * ("completion mileage oxirgi odometrdan kichik bo'lmasin"). O'zbekcha
   * xabar yoki `null` qaytaradi. Qiymat bo'sh bo'lganda ham chaqiriladi.
   */
  validate?(value: FieldValue, values: TValues): string | null;
}

/** Roadmap §1.7 dagi uch holatli rejim — `SpecField` shu bilan ishlaydi. */
export type FieldMode = "required" | "optional" | "hidden";

export type Predicate<TValues extends object = SpecValues> = (values: TValues) => boolean;

/**
 * E'lon qilingan qoida: `visible` va `required` boolean ham, predikat ham
 * bo'lishi mumkin. `resolveSpec` uni joriy qiymatlar bilan `FieldSpec` ga
 * aylantiradi.
 */
export interface FieldRule<TValues extends object = SpecValues>
  extends Omit<FieldSpec<TValues>, "required"> {
  required?: boolean | Predicate<TValues>;
  /** Berilmasa — maydon doim ko'rinadi. */
  visible?: boolean | Predicate<TValues>;
}

/** Qiymatlardan ko'rinadigan maydonlar ro'yxatini hisoblaydigan funksiya. */
export type SpecResolver<TValues extends object = SpecValues> = (
  values: TValues,
) => FieldSpec<TValues>[];

// ---------------------------------------------------------------------------
// Ichki yordamchilar
// ---------------------------------------------------------------------------

/**
 * Forma holatiga nom bo'yicha murojaat qilishning yagona joyi. Cast faqat shu
 * yerda: tashqarida hamma narsa tipli qoladi (yuqoridagi `FieldName` izohiga
 * qarang — interfeyslarda index signature yo'q).
 */
function asRecord(values: object): Record<string, FieldValue> {
  return values as unknown as Record<string, FieldValue>;
}

function asPartial<TValues extends object>(rec: Record<string, FieldValue>): Partial<TValues> {
  return rec as unknown as Partial<TValues>;
}

function test<TValues extends object>(
  value: boolean | Predicate<TValues> | undefined,
  values: TValues,
  fallback: boolean,
): boolean {
  if (value === undefined) return fallback;
  return typeof value === "function" ? value(values) : value;
}

/**
 * Maydon yashirilganda qiymati nimaga tenglashadi. Turini saqlaymiz — string
 * maydon `""` bo'ladi (Prisma uchun "bo'sh matn"), son/sana esa `null`
 * (Prisma uchun "tozalash"). `undefined` qaytarish mumkin emas: u Prisma'da
 * "tegilmasin" degani, ya'ni eski qiymat bazada qolib ketardi.
 */
function emptyLike(value: FieldValue): FieldValue {
  if (typeof value === "string") return "";
  if (typeof value === "boolean") return false;
  return null;
}

const MISSING_VERB: Record<FieldKind, string> = {
  text: "kiritilmagan",
  textarea: "kiritilmagan",
  number: "kiritilmagan",
  money: "kiritilmagan",
  date: "tanlanmagan",
  time: "tanlanmagan",
  select: "tanlanmagan",
};

const TIME_RE = /^\d{1,2}:\d{2}(:\d{2})?$/;

// ---------------------------------------------------------------------------
// Predikat yordamchilari — "faqat <shart> bo'lganda majburiy / ko'rinadi"
// ---------------------------------------------------------------------------

/**
 * Boshqa maydon qiymati sanab o'tilganlardan biriga teng bo'lsa — rost.
 *
 *   required: whenValue("status", "SCHEDULED", "COMPLETED")
 *   visible:  whenValue("status", "CLEAN")
 */
export function whenValue<TValues extends object>(
  name: FieldName<TValues>,
  ...accepted: readonly FieldValue[]
): Predicate<TValues> {
  return (values) => accepted.includes(asRecord(values)[name]);
}

export function not<TValues extends object>(predicate: Predicate<TValues>): Predicate<TValues> {
  return (values) => !predicate(values);
}

export function allOf<TValues extends object>(
  ...predicates: readonly Predicate<TValues>[]
): Predicate<TValues> {
  return (values) => predicates.every((p) => p(values));
}

export function anyOf<TValues extends object>(
  ...predicates: readonly Predicate<TValues>[]
): Predicate<TValues> {
  return (values) => predicates.some((p) => p(values));
}

// ---------------------------------------------------------------------------
// Qoidalardan spec hosil qilish
// ---------------------------------------------------------------------------

/** Qoidalar jadvalini joriy qiymatlar uchun ko'rinadigan maydonlarga aylantiradi. */
export function resolveSpec<TValues extends object>(
  rules: readonly FieldRule<TValues>[],
  values: TValues,
): FieldSpec<TValues>[] {
  const out: FieldSpec<TValues>[] = [];
  for (const rule of rules) {
    const { visible, required, ...rest } = rule;
    if (!test(visible, values, true)) continue;
    out.push({ ...rest, required: test(required, values, false) });
  }
  return out;
}

/**
 * Qoidalar jadvalini bir marta `SpecResolver` ga bog'laydi — forma, tasdiqlash
 * oynasi va server action bitta eksportni import qiladi.
 */
export function specResolver<TValues extends object>(
  rules: readonly FieldRule<TValues>[],
): SpecResolver<TValues> {
  return (values) => resolveSpec(rules, values);
}

// ---------------------------------------------------------------------------
// So'rovlar
// ---------------------------------------------------------------------------

export function fieldValue<TValues extends object>(
  values: TValues,
  name: FieldName<TValues>,
): FieldValue {
  return asRecord(values)[name];
}

/** Bo'sh deb hisoblanadi: `null`, `undefined` va faqat bo'shliqdan iborat matn. */
export function isEmptyValue(value: FieldValue): boolean {
  if (value === null || value === undefined) return true;
  return typeof value === "string" && value.trim() === "";
}

export function fieldByName<TValues extends object>(
  fields: readonly FieldSpec<TValues>[],
  name: FieldName<TValues>,
): FieldSpec<TValues> | undefined {
  return fields.find((f) => f.name === name);
}

export function modeOf<TValues extends object>(
  fields: readonly FieldSpec<TValues>[],
  name: FieldName<TValues>,
): FieldMode {
  const field = fieldByName(fields, name);
  if (!field) return "hidden";
  return field.required ? "required" : "optional";
}

export function isVisible<TValues extends object>(
  fields: readonly FieldSpec<TValues>[],
  name: FieldName<TValues>,
): boolean {
  return modeOf(fields, name) !== "hidden";
}

export function isRequired<TValues extends object>(
  fields: readonly FieldSpec<TValues>[],
  name: FieldName<TValues>,
): boolean {
  return modeOf(fields, name) === "required";
}

/** Ikki ustunli to'rda yarim ustun egallaydimi (yuqoridagi `halfWidth` izohi). */
export function isHalfWidth<TValues extends object>(field: FieldSpec<TValues>): boolean {
  return field.halfWidth ?? field.kind !== "textarea";
}

// ---------------------------------------------------------------------------
// Tekshiruv
// ---------------------------------------------------------------------------

function checkFilled<TValues extends object>(
  field: FieldSpec<TValues>,
  value: FieldValue,
): string | null {
  if (field.kind === "number" || field.kind === "money") {
    const n = typeof value === "number" ? value : Number(String(value).trim());
    if (!Number.isFinite(n)) return `${field.label} son bo'lishi kerak.`;
    if (field.min !== undefined && n < field.min) {
      return `${field.label} ${field.min} dan kichik bo'lmasligi kerak.`;
    }
    if (field.max !== undefined && n > field.max) {
      return `${field.label} ${field.max} dan katta bo'lmasligi kerak.`;
    }
  }

  // Sana/vaqt formasi to'g'ridan-to'g'ri action chaqiruvida ixtiyoriy matn
  // bo'lishi mumkin — brauzer inputi bu yerda kafolat emas.
  if (field.kind === "date" && Number.isNaN(Date.parse(String(value)))) {
    return `${field.label} sanasi noto'g'ri.`;
  }
  if (field.kind === "time" && !TIME_RE.test(String(value))) {
    return `${field.label} vaqti noto'g'ri.`;
  }

  if (field.kind === "select" && field.strictOptions && field.options) {
    const ok = field.options.some((o) => o.value === String(value));
    if (!ok) return `${field.label} uchun noto'g'ri qiymat.`;
  }

  return null;
}

/**
 * Birinchi xatoni maydonlar tartibida qaytaradi (topilmasa `null`).
 * Xabar o'zbekcha va foydalanuvchiga ko'rsatishga tayyor — client uni
 * `showError` bilan, server esa `ValidationError` bilan uzatadi.
 */
export function validateSpec<TValues extends object>(
  fields: readonly FieldSpec<TValues>[],
  values: TValues,
): string | null {
  const rec = asRecord(values);

  for (const field of fields) {
    const value = rec[field.name];

    if (isEmptyValue(value)) {
      if (field.required) return `${field.label} ${MISSING_VERB[field.kind]}.`;
    } else {
      const err = checkFilled(field, value);
      if (err) return err;
    }

    // Bo'sh qiymatda ham chaqiriladi: maydonlararo qoida ("X yoki Y dan biri
    // to'ldirilsin") aynan shu holatda ishlashi kerak.
    const custom = field.validate?.(value, values);
    if (custom) return custom;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Payload tayyorlash
// ---------------------------------------------------------------------------

/**
 * Faqat ko'rinadigan maydonlarni qoldiradi.
 *
 * Yaratish (create) uchun: foydalanuvchi turini almashtirganda ekrandan
 * yo'qolgan maydon qiymati payload'ga tushib qolmasin.
 */
export function visibleValues<TValues extends object>(
  fields: readonly FieldSpec<TValues>[],
  values: TValues,
): Partial<TValues> {
  const rec = asRecord(values);
  const out: Record<string, FieldValue> = {};
  for (const field of fields) {
    if (field.name in rec) out[field.name] = rec[field.name];
  }
  return asPartial<TValues>(out);
}

/**
 * Ko'rinmaydigan maydonlarni bo'shatib, to'liq holatni qaytaradi.
 *
 * Tahrirlash (update) uchun `visibleValues` yetarli emas: yo'q kalit Prisma'da
 * "tegilmasin" degani, ya'ni turi o'zgargan yozuvda eski qiymat bazada qolib
 * ketardi. Bu yerda ular aniq bo'sh qiymatga tenglashtiriladi.
 */
export function clearHidden<TValues extends object>(
  fields: readonly FieldSpec<TValues>[],
  values: TValues,
): TValues {
  const visible = new Set<string>(fields.map((f) => f.name));
  const out = { ...values };
  const rec = asRecord(out);
  for (const key of Object.keys(rec)) {
    if (!visible.has(key)) rec[key] = emptyLike(rec[key]);
  }
  return out;
}

/**
 * Sanab o'tilgan maydonlarni bo'shatadigan patch. Allaqachon bo'sh bo'lganlar
 * tushmaydi — shunda ortiqcha `setState` chaqirilmaydi.
 */
export function clearedPatch<TValues extends object>(
  names: readonly string[],
  values: TValues,
): Partial<TValues> {
  const rec = asRecord(values);
  const patch: Record<string, FieldValue> = {};
  for (const name of names) {
    if (!(name in rec)) continue;
    const empty = emptyLike(rec[name]);
    if (rec[name] !== empty) patch[name] = empty;
  }
  return asPartial<TValues>(patch);
}
