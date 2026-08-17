// ============================================================================
// Enum yorliqlari — bitta ro'yxat, bitta tartib, bitta manba (roadmap §1.4).
//
// E'lon tartibi UI shartnomasi: select'dagi qatorlar aynan shu ketma-ketlikda
// chiqadi. Postgres enum tartibiga tayanish taqiqlangan (roadmap P1 uy qoidasi),
// shuning uchun tartib shu yerda — JS'da — qat'iy belgilangan.
//
// Bu yerda Prisma import YO'Q: fayl client komponentlardan (`PresetSelect`,
// `StatusBadge`) import qilinadi, ya'ni `@prisma/client` runtime'i brauzer
// bundle'iga tushib qolmasligi kerak. Qiymat turlari qo'lda yozilgan literal
// union'lar; ular migratsiyalardan OLDIN ham kompilyatsiya bo'ladi (enumlarning
// ko'pi hali bazada yo'q).
//
// Tur nomlariga `...Value` qo'shimchasi ataylab: bitta faylda ham Prisma
// generatsiya qilgan `OwnershipType`ni, ham shu ro'yxatni import qilganda nom
// to'qnashuvi bo'lmasin.
// ============================================================================

export type Tone = "neutral" | "green" | "amber" | "red" | "blue" | "slate";

export interface EnumOption<T extends string = string> {
  value: T;
  label: string;
  /** `StatusBadge` rangni shundan oladi; berilmasa "neutral". */
  tone?: Tone;
}

// ---------------------------------------------------------------------------
// Yordamchilar
// ---------------------------------------------------------------------------

/**
 * Soha qisqartmalari. Uzunlik bo'yicha qoida ("3 harfgacha — katta harfda")
 * sinab ko'rildi va noto'g'ri: u "SOMETHING_NEW"ni "Something NEW" qilib
 * baqirtirib yuboradi. Ro'yxat kalta, lekin bashorat qilinadigan.
 */
const ACRONYMS: ReadonlySet<string> = new Set([
  "ACC", "ACH", "CARB", "CB", "CDL", "COI", "CPM", "CTC", "DOT", "DQ", "DVIR",
  "EFS", "ELD", "ETA", "GPS", "IFTA", "MC", "MVR", "OCAC", "OCC", "PD", "PM",
  "PR", "TI", "US", "VIN",
]);

/**
 * Xaritada yo'q qiymatni o'qiladigan matnga aylantiradi:
 * "TRUCK_OWNER_PAID" -> "Truck Owner Paid", "ACH_WIRE" -> "ACH Wire".
 */
export function humanizeEnumValue(value: string): string {
  return value
    .trim()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => {
      const upper = w.toUpperCase();
      return ACRONYMS.has(upper) ? upper : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Yorliq qidiradi. Xaritada bo'lmagan qiymat "humanize" qilinadi — migratsiya
 * qo'shgan yangi a'zo yoki eski qiymat hech qachon bo'sh katak bo'lib
 * ko'rinmasligi kerak.
 *
 * `value` ataylab `string`: bazadan kelgan eski qiymat literal union'ga
 * sig'masligi mumkin, aynan shu holat uchun kerak.
 */
export function labelFor<T extends string>(
  options: readonly EnumOption<T>[],
  value: string | null | undefined,
  emptyLabel = "—",
): string {
  const raw = (value ?? "").trim();
  if (!raw) return emptyLabel;
  return options.find((o) => o.value === raw)?.label ?? humanizeEnumValue(raw);
}

/** §1.4 dagi nom — `labelFor` bilan bir xil xatti-harakat. */
export function labelOf<T extends string>(
  options: readonly EnumOption<T>[],
  value: string | null | undefined,
  fallback = "—",
): string {
  return labelFor(options, value, fallback);
}

export function toneOf<T extends string>(
  options: readonly EnumOption<T>[],
  value: string | null | undefined,
): Tone {
  const raw = (value ?? "").trim();
  if (!raw) return "neutral";
  return options.find((o) => o.value === raw)?.tone ?? "neutral";
}

/** Server whitelist uchun: ko'r-ko'rona `as Enum` cast'lari o'rniga. */
export function isEnumValue<T extends string>(
  options: readonly EnumOption<T>[],
  value: unknown,
): value is T {
  return typeof value === "string" && options.some((o) => o.value === value);
}

/** Filtr/whitelist massivlari uchun qulay yordamchi. */
export function enumValues<T extends string>(options: readonly EnumOption<T>[]): T[] {
  return options.map((o) => o.value);
}

// ---------------------------------------------------------------------------
// Fleet — truck
// ---------------------------------------------------------------------------

export type OwnershipTypeValue = "COMPANY" | "RYDER_RENTAL" | "RYDER_LEASE" | "OWNER" | "VENDOR";

/** M04 swap-type shu tartibda yangi enum yaratadi (schemaPlan §5.2). */
export const OWNERSHIP_TYPE_OPTIONS: readonly EnumOption<OwnershipTypeValue>[] = [
  { value: "COMPANY", label: "Company" },
  { value: "RYDER_RENTAL", label: "Ryder Rental" },
  { value: "RYDER_LEASE", label: "Ryder Lease" },
  { value: "OWNER", label: "Owner" },
  { value: "VENDOR", label: "Vendor" },
];

/**
 * Ro'yxat feedback hujjatida aynan sanalgan to'rttadan iborat — o'zboshimchalik
 * bilan kengaytirilmaydi.
 *
 * `Truck.make` String bo'lib qoladi, shuning uchun qiymat = ko'rinadigan matn.
 * Bazadagi eski qiymatlar ("Freightliner", "Cascadia") bu ro'yxatga tushmaydi,
 * lekin PresetSelect noma'lum qiymatni o'chirib yubormay ko'rsatadi — eski
 * yozuvlar shundayligicha qoladi, faqat yangilari ro'yxatdan tanlanadi.
 */
export const TRUCK_MAKE_OPTIONS: readonly EnumOption<string>[] = [
  { value: "Freightliner Cascadia", label: "Freightliner Cascadia" },
  { value: "Volvo", label: "Volvo" },
  { value: "International", label: "International" },
  { value: "Kenworth", label: "Kenworth" },
];

// ---------------------------------------------------------------------------
// Safety — driver
// ---------------------------------------------------------------------------

export type DriverTypeValue = "COMPANY" | "OWNER_OPERATOR" | "LEASE_OPERATOR";

/** M03 `LEASE_PURCHASE` -> `LEASE_OPERATOR` nomini o'zgartiradi. Migratsiyagacha
 *  bazadagi eski qiymat `labelFor` orqali "Lease Purchase" bo'lib chiqadi. */
export const DRIVER_TYPE_OPTIONS: readonly EnumOption<DriverTypeValue>[] = [
  { value: "COMPANY", label: "Company" },
  { value: "OWNER_OPERATOR", label: "Owner Operator" },
  { value: "LEASE_OPERATOR", label: "Lease Operator" },
];

// ---------------------------------------------------------------------------
// Fleet — service
// ---------------------------------------------------------------------------

export type ServiceCategoryValue =
  | "TIRE_PATCH"
  | "TIRES_WHEELS"
  | "PREVENTIVE_MAINTENANCE"
  | "SUSPENSION"
  | "ELECTRICAL"
  | "ENGINE_POWERTRAIN"
  | "COOLING"
  | "AIR_SYSTEM"
  | "AXLE_HUB_BEARINGS"
  | "DOT_INSPECTION_REPAIR"
  | "TOWING_ROADSIDE"
  | "ACCIDENT_DAMAGE_REPAIR"
  | "WASH_DETAILING"
  | "BODY_EXTERIOR"
  | "OTHER";

/** 15 ta a'zo, M09 mapping SQL'idagi tartibda (schemaPlan §5.6). "Other" oxirida. */
export const SERVICE_CATEGORY_OPTIONS: readonly EnumOption<ServiceCategoryValue>[] = [
  { value: "TIRE_PATCH", label: "Tire Patch" },
  { value: "TIRES_WHEELS", label: "Tires & Wheels" },
  { value: "PREVENTIVE_MAINTENANCE", label: "Preventive Maintenance (PM)" },
  { value: "SUSPENSION", label: "Suspension" },
  { value: "ELECTRICAL", label: "Electrical" },
  { value: "ENGINE_POWERTRAIN", label: "Engine & Powertrain" },
  { value: "COOLING", label: "Cooling" },
  { value: "AIR_SYSTEM", label: "Air System & Brakes" },
  { value: "AXLE_HUB_BEARINGS", label: "Axle, Hub & Bearings" },
  { value: "DOT_INSPECTION_REPAIR", label: "DOT Inspection Repair" },
  { value: "TOWING_ROADSIDE", label: "Towing & Roadside" },
  { value: "ACCIDENT_DAMAGE_REPAIR", label: "Accident Damage Repair" },
  { value: "WASH_DETAILING", label: "Wash & Detailing" },
  { value: "BODY_EXTERIOR", label: "Body & Exterior" },
  { value: "OTHER", label: "Other" },
];

// ---------------------------------------------------------------------------
// To'lov usuli va javobgar tomon (Service + Expense uchun umumiy)
// ---------------------------------------------------------------------------

export type PaymentMethodValue =
  | "EFS"
  | "CREDIT_CARD"
  | "ACH_WIRE"
  | "ZELLE"
  | "DRIVER_PAID"
  | "TRUCK_OWNER_PAID";

export const PAYMENT_METHOD_OPTIONS: readonly EnumOption<PaymentMethodValue>[] = [
  { value: "EFS", label: "EFS" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "ACH_WIRE", label: "ACH / Wire" },
  { value: "ZELLE", label: "Zelle" },
  { value: "DRIVER_PAID", label: "Driver paid" },
  { value: "TRUCK_OWNER_PAID", label: "Truck owner paid" },
];

export type ResponsiblePartyValue =
  | "RYDER_COVERAGE"
  | "COMPANY"
  | "DRIVER"
  | "TRUCK_OWNER"
  | "BROKER"
  | "SECOND_PARTY"
  | "INSURANCE";

/**
 * Tartib qat'iy: Fleet #12 talab qilgan ketma-ketlik shu (schemaPlan C2).
 * `_EXPENSE` / `_IN_CHARGE` / `_PAYS` qo'shimchalari bazaga emas, shu yorliq
 * xaritasiga tegishli.
 */
export const RESPONSIBLE_PARTY_OPTIONS: readonly EnumOption<ResponsiblePartyValue>[] = [
  { value: "RYDER_COVERAGE", label: "Ryder Coverage" },
  { value: "COMPANY", label: "Company Expense" },
  { value: "DRIVER", label: "Driver in charge" },
  { value: "TRUCK_OWNER", label: "Truck Owner in charge" },
  { value: "BROKER", label: "Broker pays" },
  { value: "SECOND_PARTY", label: "Second Party" },
  { value: "INSURANCE", label: "Insurance" },
];

/**
 * Expense uchun aynan o'sha enum, lekin `RYDER_COVERAGE`siz — lessor qoplashi
 * faqat Service uchun mazmunli (C2). Yorliqlar ham sodda: Fleet #18 xarajat
 * formasida "Company Expense" emas, "Company" so'ragan.
 */
export type ExpenseResponsibleValue = Exclude<ResponsiblePartyValue, "RYDER_COVERAGE">;

// Tartib feedback hujjatidagidek: Driver, Company, Truck Owner, Second party,
// Insurance, Broker. Ro'yxat tartibi ataylab alifbo bo'yicha emas — eng ko'p
// ishlatiladigani birinchi turadi.
export const EXPENSE_RESPONSIBLE_OPTIONS: readonly EnumOption<ExpenseResponsibleValue>[] = [
  { value: "DRIVER", label: "Driver" },
  { value: "COMPANY", label: "Company" },
  { value: "TRUCK_OWNER", label: "Truck Owner" },
  { value: "SECOND_PARTY", label: "Second party" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "BROKER", label: "Broker" },
];

// ---------------------------------------------------------------------------
// Fleet — qurilmalar
// ---------------------------------------------------------------------------

export type DeviceStatusValue =
  | "AT_OFFICE"
  | "ASSIGNED"
  | "DRIVER_HOLD"
  | "STOLEN"
  | "LOST"
  | "RETURNED";

export const DEVICE_STATUS_OPTIONS: readonly EnumOption<DeviceStatusValue>[] = [
  { value: "AT_OFFICE", label: "At Office", tone: "slate" },
  { value: "ASSIGNED", label: "Assigned", tone: "blue" },
  { value: "DRIVER_HOLD", label: "Driver Hold", tone: "amber" },
  { value: "STOLEN", label: "Stolen", tone: "red" },
  { value: "LOST", label: "Lost", tone: "red" },
  { value: "RETURNED", label: "Returned", tone: "neutral" },
];

/**
 * `DeviceAssignment.removalReason` uchun: `ASSIGNED` sabab bo'la olmaydi
 * (C7) — qurilma biriktirilgani "olib qo'yish sababi" emas.
 */
export const DEVICE_REMOVAL_REASON_OPTIONS: readonly EnumOption<DeviceStatusValue>[] =
  DEVICE_STATUS_OPTIONS.filter((o) => o.value !== "ASSIGNED");

// ---------------------------------------------------------------------------
// Hujjat turlari
// ---------------------------------------------------------------------------

export type FleetDocumentTypeValue =
  | "REGISTRATION"
  | "ANNUAL_INSPECTION"
  | "RENTAL_AGREEMENT"
  | "LEASE_AGREEMENT"
  | "TITLE"
  | "INSURANCE_CARD"
  | "OTHER";

/** Registration / Annual Inspection / Rental Agreement — TZ 4.7 bo'yicha majburiy uchtasi birinchi. */
export const FLEET_DOCUMENT_TYPE_OPTIONS: readonly EnumOption<FleetDocumentTypeValue>[] = [
  { value: "REGISTRATION", label: "Registration" },
  { value: "ANNUAL_INSPECTION", label: "Annual Inspection" },
  { value: "RENTAL_AGREEMENT", label: "Rental Agreement" },
  { value: "LEASE_AGREEMENT", label: "Lease Agreement" },
  { value: "TITLE", label: "Title" },
  { value: "INSURANCE_CARD", label: "Insurance Card" },
  { value: "OTHER", label: "Other" },
];

export type SafetyDocumentTypeValue =
  | "CDL"
  | "MEDICAL_CARD"
  | "DQ_FILE"
  | "OCC_ACC_FILE"
  | "PD_BOBTAIL_COI"
  | "ACCIDENT_FILE"
  | "CARGO_CLAIM_FILE"
  | "INSPECTION_REPORT";

/** TZ:172 ro'yxati — aynan sakkiztasi. MVR va Drug Test Result TZ'da yo'q. */
export const SAFETY_DOCUMENT_TYPE_OPTIONS: readonly EnumOption<SafetyDocumentTypeValue>[] = [
  { value: "CDL", label: "CDL" },
  { value: "MEDICAL_CARD", label: "Medical Card" },
  { value: "DQ_FILE", label: "DQ File" },
  { value: "OCC_ACC_FILE", label: "OCC/ACC File" },
  { value: "PD_BOBTAIL_COI", label: "PD / Bobtail COI" },
  { value: "ACCIDENT_FILE", label: "Accident File" },
  { value: "CARGO_CLAIM_FILE", label: "Cargo Claim File" },
  { value: "INSPECTION_REPORT", label: "Inspection Report" },
];

export type DocumentTypeValue = FleetDocumentTypeValue | SafetyDocumentTypeValue;

/**
 * Ikkala bo'lim birlashmasi — bo'limlararo ro'yxat va qidiruv uchun.
 * Yorliqlar yuqoridagi ikki manbadan olinadi, ya'ni ikki joyda ajralib
 * ketmaydi. "Other" oxirida qoladi.
 */
export const DOCUMENT_TYPE_OPTIONS: readonly EnumOption<DocumentTypeValue>[] = [
  ...FLEET_DOCUMENT_TYPE_OPTIONS.filter((o) => o.value !== "OTHER"),
  ...SAFETY_DOCUMENT_TYPE_OPTIONS,
  ...FLEET_DOCUMENT_TYPE_OPTIONS.filter((o) => o.value === "OTHER"),
];

// ---------------------------------------------------------------------------
// Safety — da'volar, sug'urta, inspeksiyalar
// ---------------------------------------------------------------------------

export type ClaimTypeValue = "CARGO" | "LIABILITY" | "OCAC" | "PD" | "TRAILER_INTERCHANGE";

/** Q7: `OCAC` — sug'urtadagi `OCC_ACC`dan ataylab farqli, boshqa tushuncha. */
export const CLAIM_TYPE_OPTIONS: readonly EnumOption<ClaimTypeValue>[] = [
  { value: "LIABILITY", label: "Liability" },
  { value: "CARGO", label: "Cargo" },
  { value: "OCAC", label: "OCAC" },
  { value: "PD", label: "P / D" },
  { value: "TRAILER_INTERCHANGE", label: "Trailer Interchange" },
];

export type InsuranceTypeValue =
  | "OCC_ACC"
  | "PD_BOBTAIL"
  | "AUTO_LIABILITY"
  | "GENERAL_LIABILITY"
  | "MOTOR_TRUCK_CARGO"
  | "TRAILER_INTERCHANGE";

/** M14 to'rttasini `ADD VALUE` bilan qo'shadi — shuning uchun yangilari oxirida. */
export const INSURANCE_TYPE_OPTIONS: readonly EnumOption<InsuranceTypeValue>[] = [
  { value: "OCC_ACC", label: "OCC/ACC" },
  { value: "PD_BOBTAIL", label: "PD / Bobtail" },
  { value: "AUTO_LIABILITY", label: "Auto Liability" },
  { value: "GENERAL_LIABILITY", label: "General Liability" },
  { value: "MOTOR_TRUCK_CARGO", label: "Motor Truck Cargo" },
  { value: "TRAILER_INTERCHANGE", label: "Trailer Interchange" },
];

export type InspectionStatusValue = "CLEAN" | "VIOLATION" | "DQ_CLEARED";

/** M17'dan keyingi uchta status. Eski `PENDING_REVIEW`/`CLOSED` migratsiyada
 *  VIOLATION yoki CLEAN'ga o'tadi; kutilmaganda qolib ketsa `labelFor` ularni
 *  "Pending Review" deb o'qiladigan qilib ko'rsatadi. */
export const INSPECTION_STATUS_OPTIONS: readonly EnumOption<InspectionStatusValue>[] = [
  { value: "CLEAN", label: "Clean", tone: "green" },
  { value: "VIOLATION", label: "Violation", tone: "red" },
  { value: "DQ_CLEARED", label: "DQ Cleared", tone: "blue" },
];

export type InspectionLevelValue = "1" | "2" | "3";

/** `Inspection.level` bazada `Int` — select qiymatlari matn bo'lgani uchun
 *  saqlashdan oldin `Number(value)` qilinadi. */
export const INSPECTION_LEVEL_OPTIONS: readonly EnumOption<InspectionLevelValue>[] = [
  { value: "1", label: "Level 1 — Full (Driver + Vehicle)" },
  { value: "2", label: "Level 2 — Walk-Around" },
  { value: "3", label: "Level 3 — Driver Only" },
];

// ---------------------------------------------------------------------------
// Fleet — PM / DOT rejalari (P12)
// ---------------------------------------------------------------------------

export type ScheduleStatusValue = "IN_QUEUE" | "SCHEDULED" | "COMPLETED";

/** Qator tartibi bu ro'yxatdan emas, `SCHEDULE_STATUS_RANK`dan olinadi (P12) —
 *  bu yerda faqat select tartibi va yorliqlar. */
export const SCHEDULE_STATUS_OPTIONS: readonly EnumOption<ScheduleStatusValue>[] = [
  { value: "IN_QUEUE", label: "In Queue", tone: "slate" },
  { value: "SCHEDULED", label: "Scheduled", tone: "blue" },
  { value: "COMPLETED", label: "Completed", tone: "green" },
];

export type RequiredServiceValue = "PM" | "CPM" | "CARB" | "CTC" | "CAMPAIGN";

export const REQUIRED_SERVICE_OPTIONS: readonly EnumOption<RequiredServiceValue>[] = [
  { value: "PM", label: "PM" },
  { value: "CPM", label: "CPM" },
  { value: "CARB", label: "CARB" },
  { value: "CTC", label: "CTC" },
  { value: "CAMPAIGN", label: "Campaign" },
];
