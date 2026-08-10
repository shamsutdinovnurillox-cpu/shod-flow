-- Qurilma tarixi: qaysi qurilma qaysi truckda, qaysi sanadan qaysi sanagacha
-- turgani. Device.truckId joriy holat uchun qoladi (tez o'qish), tarix esa
-- shu jadvalda.

-- CreateTable
CREATE TABLE "DeviceAssignment" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "truckId" TEXT,
    "installedAt" TIMESTAMP(3) NOT NULL,
    "removedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceAssignment_deviceId_idx" ON "DeviceAssignment"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceAssignment_truckId_idx" ON "DeviceAssignment"("truckId");

-- AddForeignKey
ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: truck'ga biriktirilgan har bir mavjud qurilma uchun faol yozuv.
-- O'rnatilgan sana sifatida qurilma yaratilgan sana olinadi — aniqrog'i yo'q.
INSERT INTO "DeviceAssignment" ("id", "deviceId", "truckId", "installedAt", "isActive", "createdAt")
SELECT gen_random_uuid()::text, d."id", d."truckId", d."createdAt", true, CURRENT_TIMESTAMP
FROM "Device" d
WHERE d."truckId" IS NOT NULL;
