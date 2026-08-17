import { Prisma } from "@prisma/client";

/** Avtorizatsiya xatosi — guard'lar tashlaydi, foydalanuvchiga ko'rsatiladi. */
export class AuthError extends Error {
  constructor(message = "Ruxsat yo'q.") {
    super(message);
    this.name = "AuthError";
  }
}

// ============================================================================
// Server action xatolarini foydalanuvchi ko'radigan tushunarli xabarga aylantiradi.
// Prisma xom xatolari (P2002 unique, P2003 FK, ...) o'rniga aniq matn.
// ============================================================================

const FIELD_LABELS: Record<string, string> = {
  unitNumber: "Unit raqami",
  vin: "VIN",
  licensePlate: "Davlat raqami",
  trailerNumber: "Trailer raqami",
  cdlNumber: "CDL raqami",
  serialNumber: "Qurilma seriya raqami",
  email: "Email",
};

export function toUserMessage(e: unknown): string {
  if (e instanceof AuthError) return e.message;

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      // Prisma `target`ni ustunlar massivi sifatida beradi, lekin xatoni
      // Postgres constraint nomi bilan qaytarganda (masalan qo'lda yozilgan
      // SQL indeks) bu oddiy satr bo'ladi — massiv deb hisoblasak, .map()
      // TypeError bilan uzilib, foydalanuvchi xato o'rniga 500 ko'rardi.
      const raw = e.meta?.target;
      const targets = Array.isArray(raw) ? (raw as string[]) : typeof raw === "string" ? [raw] : [];
      const labels = targets.map((t) => FIELD_LABELS[t] ?? t).join(", ");
      return labels
        ? `Bu qiymat allaqachon band: ${labels}. Fleet bo'yicha takrorlanmas bo'lishi kerak.`
        : "Bu yozuv allaqachon mavjud (takrorlanmas maydon buzildi).";
    }
    if (e.code === "P2003") return "Bog'liq yozuv topilmadi (masalan, tanlangan haydovchi/unit mavjud emas).";
    if (e.code === "P2025") return "Yozuv topilmadi.";
  }

  if (e instanceof Error && e.message) return e.message;
  return "Kutilmagan xatolik yuz berdi. Qaytadan urinib ko'ring.";
}

/** Validatsiya xatosi — foydalanuvchiga ko'rsatiladi. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Bo'sh/yo'q qiymatni tekshiradi. */
export function requireField<T>(value: T, label: string): NonNullable<T> {
  if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
    throw new ValidationError(`"${label}" majburiy maydon.`);
  }
  return value as NonNullable<T>;
}
