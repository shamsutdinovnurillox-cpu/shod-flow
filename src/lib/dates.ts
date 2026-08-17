import { requireField, ValidationError } from "@/lib/errors";

// ============================================================================
// Sana va matn parserlari — server action'lar uchun yagona manba.
//
// Bu yordamchilar `fleet.ts:12-25` va `devices.ts:19-32,55-65` da so'zma-so'z
// takrorlangan edi. Takror nusxaning narxi: xato xabari yoki qabul qilinadigan
// format bir joyda tuzatilsa, ikkinchisi eskicha qolib ketardi va bir xil
// formadagi ikki sahifa boshqa-boshqa javob berardi.
//
// Barcha sanalar UTC'da o'qiladi: `<input type="date">` "YYYY-MM-DD" yuboradi,
// `new Date("YYYY-MM-DD")` uni UTC yarim tunda o'qiydi va baza ham shu holatda
// saqlaydi (ko'rsatish tomoni ham UTC — expiry.tsx:26-30). Shu sababli bu
// faylda hech qachon local getter/setter (getDate, setHours, ...) ishlatilmaydi
// — UTC'dan g'arbdagi foydalanuvchi bir kun oldingi sanani ko'rib qolardi.
// ============================================================================

/** Bo'sh string → null, aks holda trim. Ixtiyoriy matn maydonlari uchun. */
export function optText(v: string | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  const t = v.trim();
  return t === "" ? null : t;
}

/**
 * Bo'sh string → null, aks holda Date. Noto'g'ri sana rad etiladi.
 *
 * `undefined` va `null` farqi ataylab saqlangan: `undefined` — "maydon
 * yuborilmadi" (Prisma uchun o'zgarishsiz), `null` — "foydalanuvchi tozaladi".
 */
export function optDate(v: string | undefined, label: string): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v.trim() === "") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new ValidationError(`"${label}" sanasi noto'g'ri.`);
  return d;
}

/** Majburiy sana — bo'lmasa yoki noto'g'ri bo'lsa xato. */
export function reqDate(v: string | undefined, label: string): Date {
  // `requireField` NonNullable qaytaradi — asl nusxadagi `v as string` cast'i
  // shu tufayli kerak emas.
  const d = new Date(requireField(v, label));
  if (Number.isNaN(d.getTime())) throw new ValidationError(`"${label}" sanasi noto'g'ri.`);
  return d;
}

/** Xato xabarlarida sana — UTC'da (saqlanish formati bilan bir xil). */
export function fmtUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Bugungi kun "YYYY-MM-DD" (UTC) — forma default'i yoki `<input max>` uchun.
 *
 * Render ichida emas, hodisa/effekt ichida chaqiring: server va brauzer bir
 * xil daqiqada bo'lmasligi mumkin va SSR natijasi hydration'da farq qilardi.
 */
export function todayISO(): string {
  return fmtUtcDate(new Date());
}
