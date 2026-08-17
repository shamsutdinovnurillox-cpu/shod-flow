// ============================================================================
// Hujjat turlari reyestri.
//
// `Document.type` — Prisma enum EMAS, oddiy matn ustuni: bazada bugun erkin
// yozilgan qiymatlar ("Registration", "COI", "ACCIDENT_FILE") yonma-yon yotibdi.
// Ro'yxatni TS tomonda saqlash ataylab: yangi tur qo'shish migratsiya talab
// qilmaydi va eski qatorlar ham o'qilishda davom etadi. Almashinuv birligi —
// UPPER_SNAKE qiymat, ko'rsatiladigan matn esa faqat shu yerdan olinadi.
//
// Bu modulda React ham, server-only import ham yo'q — client komponent,
// server action va test bir xil ro'yxatni ko'radi.
// ============================================================================

export interface DocumentTypeOption {
  value: string;
  label: string;
}

/** Fleet hujjatlari — talab qilingan tartibda (tartib UI shartnomasi). */
export const FLEET_DOCUMENT_TYPES = [
  { value: "REGISTRATION", label: "Registration" },
  { value: "ANNUAL_INSPECTION", label: "Annual Inspection" },
  { value: "RENTAL_AGREEMENT", label: "Rental Agreement" },
  { value: "LEASE_AGREEMENT", label: "Lease Agreement" },
  { value: "TITLE", label: "Title" },
  { value: "CARB_CERTIFICATE", label: "CARB Certificate" },
  { value: "INSURANCE_CARD", label: "Insurance Card" },
] as const satisfies readonly DocumentTypeOption[];

/** Safety hujjatlari — TZ 5.7 dagi ro'yxat (Shod-Flow-TZ-uz.md:172), o'sha tartibda. */
export const SAFETY_DOCUMENT_TYPES = [
  { value: "CDL", label: "CDL" },
  { value: "MEDICAL_CARD", label: "Medical Card" },
  { value: "DQ_FILE", label: "DQ File" },
  { value: "OCC_ACC_FILE", label: "OCC/ACC File" },
  { value: "PD_BOBTAIL_COI", label: "PD/Bobtail COI" },
  { value: "ACCIDENT_FILE", label: "Accident File" },
  { value: "CARGO_CLAIM_FILE", label: "Cargo Claim File" },
  { value: "INSPECTION_REPORT", label: "Inspection Report" },
] as const satisfies readonly DocumentTypeOption[];

export type FleetDocumentType = (typeof FLEET_DOCUMENT_TYPES)[number]["value"];
export type SafetyDocumentType = (typeof SAFETY_DOCUMENT_TYPES)[number]["value"];
export type DocumentType = FleetDocumentType | SafetyDocumentType;

/** Ikkala ro'yxat birlashmasi — Fleet oldinda (umumiy select'lar uchun). */
export const DOCUMENT_TYPES: readonly DocumentTypeOption[] = [
  ...FLEET_DOCUMENT_TYPES,
  ...SAFETY_DOCUMENT_TYPES,
];

export type DocumentTypeScope = "FLEET" | "SAFETY" | "ALL";

/** Sahifa kontekstiga mos ro'yxat — `PresetSelect`ga to'g'ridan-to'g'ri beriladi. */
export function documentTypesFor(scope: DocumentTypeScope): readonly DocumentTypeOption[] {
  if (scope === "FLEET") return FLEET_DOCUMENT_TYPES;
  if (scope === "SAFETY") return SAFETY_DOCUMENT_TYPES;
  return DOCUMENT_TYPES;
}

const CANONICAL_VALUES: ReadonlySet<string> = new Set<string>(DOCUMENT_TYPES.map((o) => o.value));

const LABEL_BY_VALUE: ReadonlyMap<string, string> = new Map(
  DOCUMENT_TYPES.map((o) => [o.value, o.label] as const),
);

/**
 * Bazada bugun yotgan eski erkin matnlar → kanonik qiymat.
 *
 * Bu yerda faqat normalizatsiya YETMAYDIGAN holatlar turadi: "Registration" →
 * REGISTRATION o'z-o'zidan chiqadi, "COI" → PD_BOBTAIL_COI esa chiqmaydi.
 * Kalitlar allaqachon normallashtirilgan ko'rinishda (UPPER_SNAKE), chunki
 * `normalizeDocumentType()` qidirishdan oldin kirishni shu shaklga keltiradi.
 */
export const LEGACY_DOCUMENT_TYPES: Readonly<Record<string, DocumentType>> = {
  // Safety
  COI: "PD_BOBTAIL_COI",
  PD_BOBTAIL: "PD_BOBTAIL_COI",
  BOBTAIL: "PD_BOBTAIL_COI",
  MED_CARD: "MEDICAL_CARD",
  MEDICAL: "MEDICAL_CARD",
  MEDICAL_CERTIFICATE: "MEDICAL_CARD",
  DQ: "DQ_FILE",
  DQF: "DQ_FILE",
  OCC_ACC: "OCC_ACC_FILE",
  OCCACC: "OCC_ACC_FILE",
  CDL_FILE: "CDL",
  CDL_COPY: "CDL",
  ACCIDENT: "ACCIDENT_FILE",
  CARGO_CLAIM: "CARGO_CLAIM_FILE",
  CLAIM_FILE: "CARGO_CLAIM_FILE",
  INSPECTION: "INSPECTION_REPORT",
  // Fleet
  REG: "REGISTRATION",
  REGISTRATION_CARD: "REGISTRATION",
  ANNUAL_INSPECTION_CERTIFICATE: "ANNUAL_INSPECTION",
  DOT_INSPECTION: "ANNUAL_INSPECTION",
  INSURANCE: "INSURANCE_CARD",
  CARB: "CARB_CERTIFICATE",
  TITLE_CERTIFICATE: "TITLE",
  RENTAL: "RENTAL_AGREEMENT",
  LEASE: "LEASE_AGREEMENT",
};

/** "OCC/ACC File" → "OCC_ACC_FILE": harf-raqamdan boshqa hamma narsa ajratgich. */
function toKey(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Kanonik ro'yxatdagi qiymatmi — server whitelist'i uchun ham shu tekshiruv. */
export function isDocumentType(value: string): value is DocumentType {
  return CANONICAL_VALUES.has(value);
}

/**
 * Ixtiyoriy matnni kanonik turga keltiradi; mos kelmasa `null`.
 * Yozishda emas, o'qishda ishlatiladi — eski qator qiymati bazada o'zgarmaydi.
 */
export function normalizeDocumentType(raw: string | null | undefined): DocumentType | null {
  if (!raw) return null;
  const key = toKey(raw);
  if (!key) return null;
  if (isDocumentType(key)) return key;
  const mapped: DocumentType | undefined = LEGACY_DOCUMENT_TYPES[key];
  return mapped ?? null;
}

/** "PREVENTIVE_MAINTENANCE" → "Preventive Maintenance" (qisqartmalar bosh harfda qoladi). */
function humanize(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

/**
 * Ko'rsatiladigan nom. Noma'lum tur yo'qolmaydi — xom matn qaytadi, faqat
 * UPPER_SNAKE ko'rinishi o'qiladigan holga keltiriladi (aks holda qidiruv
 * natijalarida "INSURANCE_CARD" ko'rinardi).
 */
export function documentTypeLabel(raw: string | null | undefined): string {
  if (!raw) return "—";
  const canonical = normalizeDocumentType(raw);
  if (canonical) return LABEL_BY_VALUE.get(canonical) ?? canonical;
  const trimmed = raw.trim();
  if (!trimmed) return "—";
  return trimmed.includes("_") ? humanize(trimmed) : trimmed;
}

/**
 * Fayl havolasi. `?download=1` — `api/files/[id]/route.ts` shu parametrni
 * o'qib `Content-Disposition: attachment` beradi.
 *
 * Parametr faqat o'z route'imizga qo'shiladi: legacy to'g'ridan-to'g'ri S3
 * havolasida imzo (signature) query'ni ham qamrab oladi, qo'shimcha parametr
 * uni buzadi va fayl 403 bilan qaytadi.
 */
export function fileHref(doc: { fileUrl: string }, opts?: { download?: boolean }): string {
  const url = doc.fileUrl;
  if (!opts?.download || !url.includes("/api/files/")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}download=1`;
}
