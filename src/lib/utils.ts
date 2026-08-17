import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Qidiruvga qo'shiladigan qiymat — raqam va bo'sh qiymatlar ham beriladi. */
export type QueryPart = string | number | null | undefined;

/**
 * Ro'yxatlardagi erkin matn qidiruvi uchun yagona qoida.
 *
 * So'rov bo'shliq bo'yicha so'zlarga bo'linadi va HAR BIR so'z birlashtirilgan
 * haystack ichida bo'lishi shart (AND). Shu sababli "john 104" ham haydovchi
 * ismi, ham unit raqami bo'yicha bir vaqtda topadi — ilgari har bir sahifa
 * `haystack.some(f => f.includes(q))` yozardi va ikki ustunga tegishli
 * so'rovda hech narsa topilmasdi.
 *
 * Bo'sh (yoki faqat bo'shliqdan iborat) so'rov — hamma qatorga mos: ro'yxat
 * filtrsiz holatda to'liq ko'rinadi.
 *
 * Ikki chaqiruv shakli qo'llab-quvvatlanadi, ikkalasi ham bir xil ishlaydi:
 *   matchesQuery(query, a, b, c)   — qator ichida qo'lda yozilganda qulay
 *   matchesQuery([a, b, c], query) — qismlar massiv sifatida yig'ilganda
 */
export function matchesQuery(query: string, ...parts: QueryPart[]): boolean;
export function matchesQuery(parts: readonly QueryPart[], query: string): boolean;
export function matchesQuery(
  first: string | readonly QueryPart[],
  ...rest: QueryPart[]
): boolean {
  // Shakl `typeof` bilan ajratiladi — `Array.isArray` readonly massiv turini
  // har doim ham to'g'ri toraytirmaydi.
  const variadic = typeof first === "string";
  const query = variadic ? first : String(rest[0] ?? "");
  const parts = variadic ? rest : first;

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  // Qismlar bo'shliq bilan qo'shiladi — aks holda ikki ustun chegarasida
  // ("104" + "5678") mavjud bo'lmagan "1045678" mosligi paydo bo'lardi.
  const haystack = parts
    .filter((p): p is string | number => p !== null && p !== undefined && p !== "")
    .join(" ")
    .toLowerCase();

  return words.every((w) => haystack.includes(w));
}
