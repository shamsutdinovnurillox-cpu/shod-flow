"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-guard";
import { toUserMessage } from "@/lib/errors";
import type { NotificationStatus } from "@prisma/client";

const DAY = 86400000;

// ============================================================================
// Notifications (PRD 3, 4.8, 5.7). Expiration/overdue qoidalaridan avtomatik
// generatsiya qilinadi. Idempotent: bir xil (type+entityId) OPEN yozuv takror
// yaratilmaydi. Dashboard/panel ochilганда yoki cron orqali chaqiriladi.
// ============================================================================

interface Candidate {
  type: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  entityType: string;
  entityId: string;
  message: string;
  dueDate: Date | null;
}

export async function generateNotifications() {
  await requireUser();
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * DAY);

  const [drivers, trucks, trailers, services, expenses] = await Promise.all([
    prisma.driver.findMany({ where: { status: "ACTIVE" } }),
    prisma.truck.findMany(),
    prisma.trailer.findMany(),
    prisma.service.findMany({ where: { status: "IN_PROGRESS" } }),
    prisma.expense.findMany({ where: { paymentStatus: "PENDING" } }),
  ]);

  const candidates: Candidate[] = [];

  for (const d of drivers) {
    const name = `${d.firstName} ${d.lastName}`;
    if (new Date(d.cdlExpiryDate) < now) {
      candidates.push({ type: "CDL_EXPIRED", priority: "CRITICAL", entityType: "DRIVER", entityId: d.id, message: `${name}: CDL muddati tugagan.`, dueDate: d.cdlExpiryDate });
    } else if (new Date(d.cdlExpiryDate) <= in30) {
      candidates.push({ type: "CDL_EXPIRING", priority: "HIGH", entityType: "DRIVER", entityId: d.id, message: `${name}: CDL 30 kun ichida tugaydi.`, dueDate: d.cdlExpiryDate });
    }
    if (new Date(d.medCardExpiryDate) < now) {
      candidates.push({ type: "MED_EXPIRED", priority: "CRITICAL", entityType: "DRIVER", entityId: d.id, message: `${name}: Tibbiy karta muddati tugagan.`, dueDate: d.medCardExpiryDate });
    } else if (new Date(d.medCardExpiryDate) <= in30) {
      candidates.push({ type: "MED_EXPIRING", priority: "HIGH", entityType: "DRIVER", entityId: d.id, message: `${name}: Tibbiy karta 30 kun ichida tugaydi.`, dueDate: d.medCardExpiryDate });
    }
  }

  for (const t of trucks) {
    if (t.status === "IN_SERVICE") {
      candidates.push({ type: "TRUCK_LONG_SERVICE", priority: "MEDIUM", entityType: "TRUCK", entityId: t.id, message: `${t.unitNumber}: xizmatda turibdi.`, dueDate: null });
    }
  }

  for (const tr of trailers) {
    if (new Date(tr.annualInspectionDate) <= in30) {
      const expired = new Date(tr.annualInspectionDate) < now;
      candidates.push({ type: expired ? "TRAILER_INSP_EXPIRED" : "TRAILER_INSP_EXPIRING", priority: expired ? "CRITICAL" : "HIGH", entityType: "TRAILER", entityId: tr.id, message: `${tr.trailerNumber}: yillik inspeksiya ${expired ? "tugagan" : "yaqinlashmoqda"}.`, dueDate: tr.annualInspectionDate });
    }
  }

  for (const s of services) {
    candidates.push({ type: "SERVICE_IN_PROGRESS", priority: "LOW", entityType: "SERVICE", entityId: s.id, message: `Xizmat davom etmoqda: ${s.serviceType}.`, dueDate: null });
  }
  for (const x of expenses) {
    candidates.push({ type: "EXPENSE_PENDING", priority: "LOW", entityType: "EXPENSE", entityId: x.id, message: `To'lanmagan xarajat: ${x.vendor} — $${x.amount}.`, dueDate: null });
  }

  // Idempotent upsert: mavjud OPEN yozuvlarni takror yaratmaymiz.
  const existing = await prisma.notification.findMany({ where: { status: "OPEN" } });
  const seen = new Set(existing.map((n) => `${n.type}:${n.entityId}`));

  const toCreate = candidates.filter((c) => !seen.has(`${c.type}:${c.entityId}`));
  if (toCreate.length > 0) {
    await prisma.notification.createMany({ data: toCreate });
  }
  return { created: toCreate.length, total: candidates.length };
}

export async function getNotifications() {
  await requireUser();
  return prisma.notification.findMany({
    where: { status: { not: "RESOLVED" } },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
}

export async function updateNotificationStatus(id: string, status: NotificationStatus) {
  const user = await requireUser();
  try {
    await prisma.notification.update({ where: { id }, data: { status } });
    await prisma.auditLog.create({
      data: { userId: user.id, action: "STATUS_CHANGE", entityType: "Notification", entityId: id },
    });
    revalidatePath("/fleet/dashboard");
    revalidatePath("/safety/dashboard");
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}
