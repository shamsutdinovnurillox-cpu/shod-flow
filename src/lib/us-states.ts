// ============================================================================
// AQSh shtatlari — bitta manba (roadmap §1.3).
//
// `Driver.cdlState`, `Inspection.state` va `Trailer.state` uchalasi ham String
// ustun bo'lib qoladi: enum qilinsa, M02 normalizatsiyasiga tushmagan eski
// qiymatlar bazaga sig'may qolardi. Shuning uchun tekshiruv shu yerda —
// ilova qatlamida — turadi, sxemada emas.
//
// Ro'yxatda DC va PR ham bor: CDL ikkalasida ham beriladi va tashuvchilar
// Puerto Riko'da ishlaydi.
//
// Bu modul client komponentdan (`state-select.tsx`) import qilinadi, shuning
// uchun bu yerda `@/lib/errors` YO'Q — u `@prisma/client`ni tortadi va butun
// Prisma runtime brauzer bundle'iga tushib qolardi. `parseUsState` oddiy
// `Error` tashlaydi; `toUserMessage` uni baribir xabar matni sifatida
// ko'rsatadi (errors.ts:46).
// ============================================================================

export interface UsState {
  /** Ikki harfli USPS kodi — bazada aynan shu saqlanadi. */
  code: string;
  name: string;
}

export const US_STATES: readonly UsState[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "PR", name: "Puerto Rico" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

/** Kod -> nom. O(1) qidiruv: jadval katagi har qatorda chaqiradi. */
export const US_STATE_NAMES: Readonly<Record<string, string>> = Object.fromEntries(
  US_STATES.map((s) => [s.code, s.name]),
);

export const US_STATE_CODES: ReadonlySet<string> = new Set(US_STATES.map((s) => s.code));

/** Nom -> kod (katta harfda). M02 migratsiyasi bazada shuni qiladi; bu yerda
 *  esa foydalanuvchi "Texas" deb yozib yuborgan holat uchun kerak. */
const NAME_TO_CODE: Readonly<Record<string, string>> = Object.fromEntries(
  US_STATES.map((s) => [s.name.toUpperCase(), s.code]),
);

/**
 * Ko'rsatish uchun yorliq. Noma'lum qiymat o'zini qaytaradi — normalizatsiyaga
 * tushmagan eski qator bo'sh katak bo'lib ko'rinmasligi kerak.
 */
export function stateLabel(code: string | null | undefined): string {
  const raw = (code ?? "").trim();
  if (!raw) return "—";
  return US_STATE_NAMES[raw.toUpperCase()] ?? raw;
}

/** Select variantidagi matn: kod oldinda — native type-ahead ikki harf bilan ishlaydi. */
export function stateOptionLabel(state: UsState): string {
  return `${state.code} — ${state.name}`;
}

export function isUsStateCode(v: string | null | undefined): boolean {
  return !!v && US_STATE_CODES.has(v);
}

/**
 * Trim + katta harf; to'liq nom berilsa kodga aylantiradi. Noma'lum qiymat
 * o'zgarmasdan (katta harfda) qaytadi — bu yerda hech narsa tashlanmaydi,
 * qaror qabul qilish `parseUsState` zimmasida.
 */
export function normalizeUsState(v: string | null | undefined): string {
  const raw = (v ?? "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (US_STATE_CODES.has(upper)) return upper;
  return NAME_TO_CODE[upper] ?? upper;
}

/**
 * Majburiy shtat maydoni uchun server tomon tekshiruvi. Bugun `createDriver`
 * ixtiyoriy matnni yozib yuboradi — shu teshikni yopadi.
 */
export function parseUsState(v: string | null | undefined, label: string): string {
  const code = normalizeUsState(v);
  if (!code) throw new Error(`"${label}" majburiy maydon.`);
  if (!US_STATE_CODES.has(code)) {
    throw new Error(`"${label}" noto'g'ri — AQSh shtati kodi bo'lishi kerak (masalan "TX").`);
  }
  return code;
}

/** Ixtiyoriy shtat maydoni: bo'sh bo'lsa null, aks holda `parseUsState`. */
export function parseOptionalUsState(v: string | null | undefined, label: string): string | null {
  if (!(v ?? "").trim()) return null;
  return parseUsState(v, label);
}
