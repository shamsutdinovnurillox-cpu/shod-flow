"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth-guard";

export async function getAuditLogs() {
  await requireAdmin();
  return prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { timestamp: "desc" },
    take: 100,
  });
}

/**
 * Dashboard'dagi "Activity" lentasi uchun oxirgi o'zgarishlar.
 * getAuditLogs'dan farqi: admin talab qilinmaydi va hajmi kichik.
 */
export async function getRecentActivity(take = 8) {
  await requireUser();
  return prisma.auditLog.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { timestamp: "desc" },
    take,
  });
}

// Barcha dashboard'lar uchun umumiy KPI to'plami (real ma'lumotdan).
export async function getDashboardStats() {
  await requireUser();

  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    trucksCount,
    trucksAssigned,
    trucksUnassigned,
    trucksInService,
    trailersCount,
    trailersUnassigned,
    driversActive,
    driversTerminated,
    openServices,
    openAccidents,
    openClaims,
    pendingInspections,
    cdlExpiring,
    medExpiring,
    expiringDocs,
    openAlerts,
    monthlyServiceAgg,
    monthlyExpenseAgg,
    pendingPostAccidentTests,
    inspectionsThisMonth,
    occAccRejected,
    expiredDocs,
  ] = await Promise.all([
    prisma.truck.count(),
    prisma.truck.count({ where: { status: "ASSIGNED" } }),
    prisma.truck.count({ where: { status: "UNASSIGNED" } }),
    prisma.truck.count({ where: { status: "IN_SERVICE" } }),
    prisma.trailer.count(),
    prisma.trailer.count({ where: { status: "UNASSIGNED" } }),
    prisma.driver.count({ where: { status: "ACTIVE" } }),
    prisma.driver.count({ where: { status: "TERMINATED" } }),
    prisma.service.count({ where: { status: "IN_PROGRESS" } }),
    prisma.accident.count({ where: { status: "PENDING" } }),
    prisma.cargoClaim.count({ where: { status: "PENDING" } }),
    prisma.inspection.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.driver.count({ where: { status: "ACTIVE", cdlExpiryDate: { lte: in30 } } }),
    prisma.driver.count({ where: { status: "ACTIVE", medCardExpiryDate: { lte: in30 } } }),
    prisma.document.count({ where: { expiryDate: { lte: in30 } } }),
    prisma.notification.count({ where: { status: "OPEN" } }),
    prisma.service.aggregate({ _sum: { cost: true }, where: { serviceDate: { gte: startOfMonth } } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfMonth } } }),
    prisma.accident.count({ where: { status: "PENDING", postAccidentTestDone: false } }),
    prisma.inspection.count({ where: { date: { gte: startOfMonth } } }),
    prisma.insurance.count({ where: { type: "OCC_ACC", status: "REJECTED" } }),
    prisma.document.count({ where: { expiryDate: { lt: new Date() } } }),
  ]);

  return {
    // Fleet
    trucksCount,
    trucksAssigned,
    trucksUnassigned,
    trucksInService,
    trailersCount,
    trailersUnassigned,
    openServices,
    monthlyServiceCost: monthlyServiceAgg._sum.cost ?? 0,
    monthlyExpenses: monthlyExpenseAgg._sum.amount ?? 0,
    expiringDocs,
    openAlerts,
    // Safety
    driversActive,
    driversTerminated,
    cdlExpiring,
    medExpiring,
    openAccidents,
    openClaims,
    pendingInspections,
    pendingPostAccidentTests,
    inspectionsThisMonth,
    occAccRejected,
    expiredDocs,
    // Orqaga moslik (eski dashboard maydonlari)
    driversCount: driversActive,
    openClaimsCount: openClaims,
  };
}
