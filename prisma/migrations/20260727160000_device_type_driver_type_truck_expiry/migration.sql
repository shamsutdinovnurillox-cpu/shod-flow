-- TZ 4.2 talablari:
--   * Trucks jadvalida REG. EXP. va INSP. YEAR ustunlari → Truck'ga muddat maydonlari
--   * DRIVER TYPE ustuni → Driver'ga driverType
--   * MOTIVE GATEWAY S/N ... CHAINS # ustunlari → Device'ga type + unique serialNumber
--
-- Tartib muhim: avval ustunlar qo'shiladi va to'ldiriladi, unique indeks esa
-- eng oxirida — backfill natijasida takrorlanish bo'lsa, migratsiya shu yerda
-- ochiq xato bilan to'xtaydi (jimgina noto'g'ri ma'lumot qolib ketmasin).

-- CreateEnum
CREATE TYPE "DriverType" AS ENUM ('COMPANY', 'OWNER_OPERATOR', 'LEASE_PURCHASE');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('MOTIVE_GATEWAY', 'CAMERA', 'PREPASS', 'ELD_PT30', 'TABLET', 'CHAINS', 'OTHER');

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "serialNumber" TEXT,
ADD COLUMN     "type" "DeviceType" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "driverType" "DriverType" NOT NULL DEFAULT 'COMPANY';

-- AlterTable
ALTER TABLE "Truck" ADD COLUMN     "annualInspectionDate" TIMESTAMP(3),
ADD COLUMN     "registrationExpiry" TIMESTAMP(3);

-- Backfill 1: mavjud qurilma nomidan turni aniqlash.
-- Nomlar device_registry migratsiyasi va seed tomonidan yozilgan.
UPDATE "Device" SET "type" = CASE lower(btrim("name"))
    WHEN 'motive gateway' THEN 'MOTIVE_GATEWAY'
    WHEN 'camera'         THEN 'CAMERA'
    WHEN 'prepass'        THEN 'PREPASS'
    WHEN 'eld pt30'       THEN 'ELD_PT30'
    WHEN 'tablet'         THEN 'TABLET'
    WHEN 'chains'         THEN 'CHAINS'
    ELSE 'OTHER'
END::"DeviceType";

-- Backfill 2: seriya raqamini notes'dan serialNumber'ga ko'chirish.
-- device_registry "Legacy value: MG-1001" ko'rinishida yozgan, seed esa toza
-- "MG-1001". Faqat seriya raqamiga o'xshash (bo'shliqsiz) qiymatlar olinadi —
-- foydalanuvchi yozgan haqiqiy izohlar tegilmaydi.
UPDATE "Device"
SET "serialNumber" = btrim(regexp_replace("notes", '^Legacy value:\s*', '')),
    "notes" = NULL
WHERE "notes" ~ '^(Legacy value:\s*)?[A-Za-z0-9._/-]+$'
  AND "type" <> 'CHAINS';

-- Takrorlanishlarni tozalash — unique indeksdan OLDIN.
-- Eski sxemada uniqueness har bir ustun bo'yicha alohida edi (Truck_camera_key,
-- Truck_prePass_key, ...), shuning uchun "N/A" yoki "-" kabi to'ldiruvchi qiymat
-- ikki xil ustunda qonuniy ravishda takrorlangan bo'lishi mumkin. Ular bitta
-- ustunga yig'ilgach unique indeks migratsiyani to'xtatib qo'yadi va baza
-- yarim ko'chgan holatda qoladi. Har bir seriya raqamidan eng eskisini
-- qoldiramiz, qolganini NULL qilamiz (nullable unique bir nechta NULL'ga ruxsat beradi).
UPDATE "Device" d
SET "serialNumber" = NULL
WHERE d."serialNumber" IS NOT NULL
  AND d."id" <> (
    SELECT d2."id" FROM "Device" d2
    WHERE d2."serialNumber" = d."serialNumber"
    ORDER BY d2."createdAt" ASC, d2."id" ASC
    LIMIT 1
  );

-- CreateIndex
CREATE UNIQUE INDEX "Device_serialNumber_key" ON "Device"("serialNumber");
