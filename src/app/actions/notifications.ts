"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-guard";
import { toUserMessage } from "@/lib/errors";
import { runNotificationGeneration } from "@/lib/notification-rules";
import type { NotificationStatus } from "@prisma/client";

// ============================================================================
// Notifications (PRD 3, 4.8, 5.7). Qoidalar src/lib/notification-rules.ts da —
// dashboard renderida (shu action) va /api/cron/notifications da ishlaydi.
// ============================================================================

/** Bo'limga tegishli entity turlari (dept bo'yicha filtrlash uchun). */
const FLEET_ENTITY_TYPES = ["TRUCK", "TRAILER", "SERVICE", "EXPENSE"];
const SAFETY_ENTITY_TYPES = ["DRIVER", "ACCIDENT", "CLAIM", "INSPECTION", "INSURANCE"];

export async function generateNotifications() {
  await requireUser();
  return runNotificationGeneration();
}

// String ustunda alfavit tartibi noto'g'ri (LOW < MEDIUM) — rank bilan saralaymiz.
const PRIORITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export async function getNotifications(dept?: "FLEET" | "SAFETY") {
  await requireUser();
  const notifications = await prisma.notification.findMany({
    where: {
      status: { not: "RESOLVED" },
      ...(dept ? { entityType: { in: dept === "FLEET" ? FLEET_ENTITY_TYPES : SAFETY_ENTITY_TYPES } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return notifications.sort(
    (a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9),
  );
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
    revalidatePath("/fleet/notifications");
    revalidatePath("/safety/notifications");
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}
