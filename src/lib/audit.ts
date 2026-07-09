import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// ============================================================================
// Audit yordamchilari (PRD 3: har bir o'zgarish kim/qachon/nima bilan yozilsin).
// changedFields — eski va yangi qiymatlar diffini AuditLog.details uchun tayyorlaydi.
// ============================================================================

type Db = Prisma.TransactionClient | typeof prisma;

function serialize(v: unknown): string | number | boolean | null {
  if (v === undefined || v === null) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  return JSON.stringify(v);
}

/**
 * Yangilanayotgan maydonlar bo'yicha {maydon: {from, to}} diffini qaytaradi.
 * Faqat `after`da berilgan (undefined bo'lmagan) va qiymati o'zgargan maydonlar kiradi.
 */
export function changedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Prisma.JsonObject | null {
  const diff: Prisma.JsonObject = {};
  for (const key of Object.keys(after)) {
    if (after[key] === undefined) continue;
    const from = serialize(before[key]);
    const to = serialize(after[key]);
    if (from !== to) diff[key] = { from, to };
  }
  return Object.keys(diff).length > 0 ? diff : null;
}

export async function writeAudit(
  db: Db,
  entry: {
    userId: string;
    action: string; // CREATE, UPDATE, DELETE, STATUS_CHANGE, ASSIGN, MOVE, DROP, UPLOAD
    entityType: string;
    entityId: string;
    details?: Prisma.JsonObject | null;
  },
) {
  await db.auditLog.create({
    data: {
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: entry.details ?? undefined,
    },
  });
}
