import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// ============================================================================
// PostgreSQL ulanishi (node-postgres adapter orqali).
//
// Lokal:  docker-compose.yml → postgresql://shodflow:shodflow@localhost:5433/shodflow
// Prod:   Neon (URL'da sslmode=require bo'ladi — pg buni o'zi hisobga oladi)
//
// Ikkala holatda ham bir xil kod ishlaydi: farq faqat DATABASE_URL'da.
// ============================================================================

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL o'rnatilmagan. Lokal ishlash uchun: `docker compose up -d` va .env faylini tekshiring.",
  );
}

// Dev'da HMR modulni qayta yuklaydi. Pool global'da keshlanmasa, har bir
// reload yangi ulanishlar ochib, eskilari osilib qoladi.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
    // Prodda shovqin/perf bo'lmasligi uchun faqat dev'da xato/ogohlantirish loglari.
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
