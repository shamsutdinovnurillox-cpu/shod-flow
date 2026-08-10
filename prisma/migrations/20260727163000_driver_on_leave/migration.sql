-- Drivers sahifasidagi "On Leave" holati uchun yangi status.
-- ACTIVE dan keyin qo'yiladi — getDrivers() status bo'yicha saralaydi,
-- shuning uchun tartib: Active → On Leave → Terminated.
ALTER TYPE "DriverStatus" ADD VALUE 'ON_LEAVE' AFTER 'ACTIVE';
