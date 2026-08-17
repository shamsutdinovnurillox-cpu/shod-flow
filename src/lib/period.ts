// ============================================================================
// Davr (period) matematikasi — "bu oy", "bu chorak", "yil boshidan" degan
// chegaralarni hisoblaydigan YAGONA joy.
//
// INVARIANT: hisobot chegarasi ilovada boshqa hech qayerda hisoblanmaydi.
// `getDashboardStats` (admin.ts:34-36) o'zining `startOfMonth`ini shu yerga
// almashtiradi va Fleet Overview'ning Spend paneli ham shu funksiyani
// chaqiradi. Ikki joyda ikki xil hisoblansa, oy chegarasidagi (yoki DST
// kechasidagi) so'rovda KPI plitkasi va panel bir-biriga zid raqam
// ko'rsatardi — foydalanuvchi uchun bu "raqamlar noto'g'ri" degani.
//
// Hammasi UTC: sanalar bazada UTC yarim tunda saqlanadi (expiry.tsx:26-30).
// Local getter ishlatilsa, serverning zonasi UTC'dan g'arbda bo'lganida
// "oy boshi" haqiqiy oy boshidan bir necha soat kechikardi va oyning
// birinchi kunidagi yozuvlar hisobdan tushib qolardi. Shuning uchun bu
// faylda faqat `Date.UTC` va `getUTC*` ishlatiladi.
//
// Oraliq YARIM OCHIQ: `[from, to)`. Prisma'da `{ gte: from, lt: to }` deb
// yoziladi — `lte` ishlatilsa keyingi davrning birinchi kuni ikki marta
// sanaladi.
// ============================================================================

export type Period = "TODAY" | "WEEK" | "MONTH" | "QUARTER" | "YTD" | "LAST_12M" | "CUSTOM";

export interface PeriodOption {
  value: Period;
  label: string;
}

/** Select uchun tartib — bu ro'yxat UI shartnomasi (DB tartibi emas). */
export const PERIOD_OPTIONS: readonly PeriodOption[] = [
  { value: "TODAY", label: "Today" },
  { value: "WEEK", label: "This Week" },
  { value: "MONTH", label: "This Month" },
  { value: "QUARTER", label: "This Quarter" },
  { value: "YTD", label: "Year to Date" },
  { value: "LAST_12M", label: "Last 12 Months" },
  { value: "CUSTOM", label: "Custom Range" },
];

/** `from` — kiradi, `to` — kirmaydi (yarim ochiq oraliq). */
export interface PeriodRange {
  from: Date;
  to: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Berilgan lahzaning UTC kun boshi. */
function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** UTC bo'lgani uchun kun qo'shish oddiy ms arifmetikasi — DST sakrashi yo'q. */
function addUtcDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

/**
 * Oy boshi, `offset` oy siljish bilan. Kun har doim 1 bo'lgani uchun
 * "31-yanvar + 1 oy" kabi toshib ketish holati umuman yuzaga kelmaydi.
 */
function startOfUtcMonth(d: Date, offset = 0): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1));
}

/** Noma'lum satrni (URL parametri, forma qiymati) ko'r-ko'rona cast qilmaslik uchun. */
export function isPeriod(v: string | null | undefined): v is Period {
  return PERIOD_OPTIONS.some((o) => o.value === v);
}

/**
 * Davr chegaralari. `now` faqat test uchun beriladi — ish kodida standart
 * qiymat qoldiriladi, aks holda chaqiruvchi yana o'z "hozir"ini yasaydi.
 */
export function periodRange(period: Period, now: Date = new Date()): PeriodRange {
  const today = startOfUtcDay(now);
  const tomorrow = addUtcDays(today, 1);

  switch (period) {
    case "TODAY":
      return { from: today, to: tomorrow };

    case "WEEK": {
      // Hafta dushanbadan boshlanadi (ISO 8601). `getUTCDay()` da 0 —
      // yakshanba, shuning uchun +6 va mod 7 bilan dushanbaga suriladi.
      const sinceMonday = (now.getUTCDay() + 6) % 7;
      return { from: addUtcDays(today, -sinceMonday), to: addUtcDays(today, 7 - sinceMonday) };
    }

    case "MONTH":
      return { from: startOfUtcMonth(now), to: startOfUtcMonth(now, 1) };

    case "QUARTER": {
      const quarterStart = Math.floor(now.getUTCMonth() / 3) * 3;
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), quarterStart, 1)),
        to: new Date(Date.UTC(now.getUTCFullYear(), quarterStart + 3, 1)),
      };
    }

    // "Yil boshidan bugungacha" — yuqori chegara yil oxiri emas, ertaga.
    case "YTD":
      return { from: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), to: tomorrow };

    // Joriy oy bilan birga 12 ta to'liq kalendar oy — oylik ustunli
    // diagrammada aynan 12 ta chelak chiqishi uchun.
    case "LAST_12M":
      return { from: startOfUtcMonth(now, -11), to: startOfUtcMonth(now, 1) };

    // CUSTOM chegaralarini foydalanuvchi kiritadi (`resolveRange`). Bu yerda
    // "cheklovsiz" oraliq qaytadi: xato chaqiruv jimgina bo'sh ro'yxat
    // ko'rsatgandan ko'ra, hamma narsani ko'rsatgani afzal.
    case "CUSTOM":
      return { from: new Date(0), to: tomorrow };
  }
}

/** "YYYY-MM-DD" → UTC kun boshi. Boshqa formatlar — `null`. */
function parseUtcDay(v: string | null | undefined): Date | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Davr + foydalanuvchi kiritgan sanalar → chegara. CUSTOM uchun `from`/`to`
 * "YYYY-MM-DD" ko'rinishida (URL parametri yoki `<input type="date">`).
 *
 * `to` bir kun oldinga suriladi: foydalanuvchi "31-avgustgacha" desa,
 * 31-avgust yozuvlari ham kirishi kerak, ammo oraliq yarim ochiq.
 * Bo'sh yoki noto'g'ri qiymat — o'sha tomon cheklanmaydi.
 */
export function resolveRange(
  period: Period,
  custom?: { from?: string | null; to?: string | null },
  now: Date = new Date(),
): PeriodRange {
  const base = periodRange(period, now);
  if (period !== "CUSTOM") return base;

  const from = parseUtcDay(custom?.from);
  const to = parseUtcDay(custom?.to);
  return {
    from: from ?? base.from,
    to: to ? addUtcDays(to, 1) : base.to,
  };
}
