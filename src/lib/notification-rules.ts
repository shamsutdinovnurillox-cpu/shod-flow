import "server-only";
import { prisma } from "./prisma";

// ============================================================================
// Notification generatsiya yadrosi (PRD 3, 4.8, 5.7). Ham dashboard render'ida
// (server action orqali), ham cron route'da ishlatiladi — shu sabab sessiyaga
// bog'liq emas. Idempotent: OPEN/SNOOZED yozuvlar takrorlanmaydi; RESOLVED
// bo'lganlar 30 kunlik grace davridan keyingina qayta ochiladi.
// ============================================================================

const DAY = 86400000;

// PRD 4.8: "in service too long" / "dormant too long" chegaralari (kun).
const TRUCK_IN_SERVICE_THRESHOLD_DAYS = 7;
const TRAILER_DORMANT_THRESHOLD_DAYS = 14;

interface Candidate {
  type: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  entityType: string;
  entityId: string;
  message: string;
  dueDate: Date | null;
}

export async function runNotificationGeneration() {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * DAY);

  const [drivers, trucks, trailers, services, expenses, accidents, claims, inspections, insurances] = await Promise.all([
    prisma.driver.findMany({ where: { status: "ACTIVE" } }),
    prisma.truck.findMany(),
    prisma.trailer.findMany(),
    prisma.service.findMany({ where: { status: "IN_PROGRESS" } }),
    prisma.expense.findMany({ where: { paymentStatus: "PENDING" } }),
    prisma.accident.findMany({ where: { status: "PENDING" }, include: { driver: true } }),
    prisma.cargoClaim.findMany({ where: { status: "PENDING" }, include: { driver: true } }),
    prisma.inspection.findMany({ where: { status: "PENDING_REVIEW" }, include: { driver: true } }),
    prisma.insurance.findMany({
      where: { OR: [{ status: "MISSING" }, { status: "REJECTED" }, { status: "ACTIVE" }] },
      include: { driver: true, truck: true },
    }),
  ]);

  const candidates: Candidate[] = [];

  // --- Haydovchi hujjatlari (CDL / tibbiy karta) ---
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

  // --- Truck: xizmatda uzoq qolganlar (threshold: updatedAt bo'yicha) ---
  for (const t of trucks) {
    if (t.status === "IN_SERVICE" && now.getTime() - new Date(t.updatedAt).getTime() > TRUCK_IN_SERVICE_THRESHOLD_DAYS * DAY) {
      candidates.push({ type: "TRUCK_LONG_SERVICE", priority: "MEDIUM", entityType: "TRUCK", entityId: t.id, message: `${t.unitNumber}: xizmatda ${TRUCK_IN_SERVICE_THRESHOLD_DAYS} kundan ortiq turibdi.`, dueDate: null });
    }
  }

  // --- Trailer: yillik inspeksiya + dormant ---
  for (const tr of trailers) {
    if (new Date(tr.annualInspectionDate) <= in30) {
      const expired = new Date(tr.annualInspectionDate) < now;
      candidates.push({ type: expired ? "TRAILER_INSP_EXPIRED" : "TRAILER_INSP_EXPIRING", priority: expired ? "CRITICAL" : "HIGH", entityType: "TRAILER", entityId: tr.id, message: `${tr.trailerNumber}: yillik inspeksiya ${expired ? "tugagan" : "yaqinlashmoqda"}.`, dueDate: tr.annualInspectionDate });
    }
    const idle = tr.status === "UNASSIGNED" || tr.status === "EMPTY";
    if (idle && now.getTime() - new Date(tr.updatedAt).getTime() > TRAILER_DORMANT_THRESHOLD_DAYS * DAY) {
      candidates.push({ type: "TRAILER_DORMANT", priority: "MEDIUM", entityType: "TRAILER", entityId: tr.id, message: `${tr.trailerNumber}: ${TRAILER_DORMANT_THRESHOLD_DAYS} kundan ortiq band emas (dormant).`, dueDate: null });
    }
  }

  // --- Fleet: ochiq xizmat va to'lanmagan xarajat ---
  for (const s of services) {
    candidates.push({ type: "SERVICE_IN_PROGRESS", priority: "LOW", entityType: "SERVICE", entityId: s.id, message: `Xizmat davom etmoqda: ${s.serviceType}.`, dueDate: null });
  }
  for (const x of expenses) {
    candidates.push({ type: "EXPENSE_PENDING", priority: "LOW", entityType: "EXPENSE", entityId: x.id, message: `To'lanmagan xarajat: ${x.vendor} — $${x.amount}.`, dueDate: null });
  }

  // --- Safety: avariya / claim / inspeksiya (PRD 5.7) ---
  for (const a of accidents) {
    const name = `${a.driver.firstName} ${a.driver.lastName}`;
    if (!a.postAccidentTestDone) {
      candidates.push({ type: "POST_ACCIDENT_TEST_PENDING", priority: "CRITICAL", entityType: "ACCIDENT", entityId: a.id, message: `${name}: avariyadan keyingi test bajarilmagan.`, dueDate: null });
    }
    candidates.push({ type: "ACCIDENT_OPEN", priority: "MEDIUM", entityType: "ACCIDENT", entityId: a.id, message: `Ochiq avariya: ${name} — ${a.location}.`, dueDate: null });
  }
  for (const c of claims) {
    candidates.push({ type: "CLAIM_OPEN", priority: "MEDIUM", entityType: "CLAIM", entityId: c.id, message: `Ochiq cargo claim: ${c.claimNumber ?? c.loadNumber} (${c.driver.firstName} ${c.driver.lastName}).`, dueDate: null });
  }
  for (const i of inspections) {
    candidates.push({ type: "INSPECTION_PENDING_REVIEW", priority: "HIGH", entityType: "INSPECTION", entityId: i.id, message: `Inspeksiya ko'rib chiqilmagan: ${i.state} Level ${i.level} (${i.driver.firstName} ${i.driver.lastName}).`, dueDate: null });
  }

  // --- Sug'urta: COI muddati/yo'qligi, OCC/ACC rejected (PRD 5.3, 5.7) ---
  for (const ins of insurances) {
    const who = ins.type === "OCC_ACC"
      ? `${ins.driver?.firstName ?? ""} ${ins.driver?.lastName ?? ""}`.trim() || "Noma'lum haydovchi"
      : ins.truck?.unitNumber ?? "Noma'lum truck";
    if (ins.status === "MISSING") {
      candidates.push({ type: "COI_MISSING", priority: "CRITICAL", entityType: "INSURANCE", entityId: ins.id, message: `${who}: COI mavjud emas.`, dueDate: null });
    } else if (ins.status === "REJECTED" && ins.type === "OCC_ACC") {
      candidates.push({ type: "OCC_ACC_REJECTED", priority: "HIGH", entityType: "INSURANCE", entityId: ins.id, message: `${who}: OCC/ACC rad etilgan.`, dueDate: null });
    } else if (ins.status === "ACTIVE" && ins.expiryDate) {
      if (new Date(ins.expiryDate) < now) {
        candidates.push({ type: "INSURANCE_EXPIRED", priority: "CRITICAL", entityType: "INSURANCE", entityId: ins.id, message: `${who}: sug'urta (${ins.type}) muddati tugagan.`, dueDate: ins.expiryDate });
      } else if (new Date(ins.expiryDate) <= in30) {
        candidates.push({ type: "INSURANCE_EXPIRING", priority: "HIGH", entityType: "INSURANCE", entityId: ins.id, message: `${who}: sug'urta (${ins.type}) 30 kun ichida tugaydi.`, dueDate: ins.expiryDate });
      }
    }
  }

  // Idempotent: OPEN/SNOOZED yozuvlar takror yaratilmaydi; RESOLVED qilinganlar
  // 30 kunlik "grace" davrida qayta ochilmaydi.
  const graceCutoff = new Date(now.getTime() - 30 * DAY);
  const existing = await prisma.notification.findMany({
    where: {
      OR: [
        { status: { in: ["OPEN", "SNOOZED"] } },
        { status: "RESOLVED", updatedAt: { gte: graceCutoff } },
      ],
    },
  });
  const seen = new Set(existing.map((n) => `${n.type}:${n.entityId}`));

  const toCreate = candidates.filter((c) => !seen.has(`${c.type}:${c.entityId}`));
  if (toCreate.length > 0) {
    await prisma.notification.createMany({ data: toCreate });
  }
  return { created: toCreate.length, total: candidates.length };
}
