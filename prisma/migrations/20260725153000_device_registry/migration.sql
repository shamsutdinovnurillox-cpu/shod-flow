-- Qurilmalar reyestri: Truck'dagi qattiq kodlangan device ustunlari o'rniga
-- alohida "Device" jadvali. Tartib muhim — avval jadval yaratiladi va eski
-- qiymatlar ko'chiriladi, faqat SHUNDAN KEYIN ustunlar o'chiriladi.

-- CreateEnum
CREATE TYPE "DeviceCondition" AS ENUM ('NEW', 'USED', 'OLD');

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vin" TEXT,
    "expiryDate" TIMESTAMP(3),
    "condition" "DeviceCondition" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "truckId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Device_truckId_idx" ON "Device"("truckId");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: har bir to'ldirilgan eski ustun → bitta Device qatori.
--   name      = qurilma nomi
--   vin       = biriktirilgan truck VIN'i
--   condition = USED (allaqachon truck'da o'rnatilgan)
--   notes     = eski ustundagi seriya raqami (yo'qolmasligi uchun)
INSERT INTO "Device" ("id", "name", "vin", "condition", "truckId", "notes", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    legacy.name,
    t."vin",
    'USED'::"DeviceCondition",
    t."id",
    CASE WHEN legacy.name = 'Chains' THEN NULL ELSE 'Legacy value: ' || legacy.value END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Truck" t
CROSS JOIN LATERAL (
    VALUES
        ('Motive Gateway', t."motiveGateway"),
        ('Camera',         t."camera"),
        ('PrePass',        t."prePass"),
        ('ELD PT30',       t."eldPt30"),
        ('Tablet',         t."tablet"),
        ('Chains',         CASE WHEN t."chains" THEN 'yes' END)
) AS legacy(name, value)
WHERE legacy.value IS NOT NULL AND btrim(legacy.value) <> '';

-- DropIndex
DROP INDEX "Truck_motiveGateway_key";
DROP INDEX "Truck_camera_key";
DROP INDEX "Truck_prePass_key";
DROP INDEX "Truck_eldPt30_key";
DROP INDEX "Truck_tablet_key";

-- AlterTable
ALTER TABLE "Truck" DROP COLUMN "camera",
DROP COLUMN "chains",
DROP COLUMN "eldPt30",
DROP COLUMN "motiveGateway",
DROP COLUMN "prePass",
DROP COLUMN "tablet";
