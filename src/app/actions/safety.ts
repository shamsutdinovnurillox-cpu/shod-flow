"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUser, requirePermission } from "@/lib/auth-guard";
import { toUserMessage, requireField, ValidationError } from "@/lib/errors";
import type { InsuranceType, EventStatus, InspectionStatus } from "@prisma/client";

// ============================================================================
// SAFETY actions. Driver — SHARED master data (o'qish har qanday login uchun).
// Yozish — faqat SAFETY yoki ADMIN.
// ============================================================================

// ---- DRIVERS ----
export interface DriverInput {
  firstName: string;
  lastName: string;
  dob: string;
  cdlNumber: string;
  cdlState: string;
  cdlIssueDate: string;
  cdlExpiryDate: string;
  medCardExpiryDate: string;
  hireDate: string;
  notes?: string;
}

export async function getDrivers() {
  await requireUser();
  // ACTIVE avval, TERMINATED pastda (PRD talabi).
  return prisma.driver.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function createDriver(data: DriverInput) {
  const user = await requirePermission("safety.drivers");
  try {
    requireField(data.firstName, "Ism");
    requireField(data.lastName, "Familiya");
    requireField(data.dob, "Tug'ilgan sana");
    requireField(data.cdlNumber, "CDL raqami");
    requireField(data.cdlState, "CDL shtati");
    requireField(data.cdlIssueDate, "CDL berilgan sana");

    const driver = await prisma.driver.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        dob: new Date(data.dob),
        cdlNumber: data.cdlNumber.trim(),
        cdlState: data.cdlState.trim(),
        cdlIssueDate: new Date(data.cdlIssueDate),
        cdlExpiryDate: new Date(data.cdlExpiryDate),
        medCardExpiryDate: new Date(data.medCardExpiryDate),
        hireDate: new Date(data.hireDate),
        status: "ACTIVE",
        notes: data.notes?.trim() || null,
      },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "CREATE", entityType: "Driver", entityId: driver.id },
    });

    revalidatePath("/safety/drivers");
    return driver;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

// ---- INSURANCE ----
export interface InsuranceInput {
  type: string; // "OCC_ACC" (driver) yoki "PD_BOBTAIL" (truck)
  driverId?: string;
  truckId?: string;
  endDate?: string;
}

export async function getInsurances() {
  await requirePermission("safety.insurance");
  return prisma.insurance.findMany({
    include: { driver: true, truck: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createInsurance(data: InsuranceInput) {
  const user = await requirePermission("safety.insurance");
  try {
    if (data.type === "OCC_ACC") {
      requireField(data.driverId, "Haydovchi");
    } else if (data.type === "PD_BOBTAIL") {
      requireField(data.truckId, "Truck");
    } else {
      throw new ValidationError("Sug'urta turi noto'g'ri.");
    }

    const insurance = await prisma.insurance.create({
      data: {
        type: data.type as InsuranceType,
        driverId: data.type === "OCC_ACC" ? data.driverId : null,
        truckId: data.type === "PD_BOBTAIL" ? data.truckId : null,
        expiryDate: data.endDate ? new Date(data.endDate) : null,
        status: "ACTIVE",
      },
      include: { driver: true, truck: true },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "CREATE", entityType: "Insurance", entityId: insurance.id },
    });

    revalidatePath("/safety/insurance");
    return insurance;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

// ---- ACCIDENTS ----
export interface AccidentInput {
  driverId: string;
  truckId?: string;
  date: string;
  location: string;
  fault?: string;
  postAccidentTestDone?: boolean;
  description?: string;
  status?: string;
}

export async function getAccidents() {
  await requirePermission("safety.accidents");
  return prisma.accident.findMany({
    include: { driver: true, truck: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function createAccident(data: AccidentInput) {
  const user = await requirePermission("safety.accidents");
  try {
    requireField(data.driverId, "Haydovchi");
    requireField(data.location, "Manzil");

    const accident = await prisma.accident.create({
      data: {
        driverId: data.driverId,
        truckId: data.truckId || null,
        date: new Date(data.date),
        location: data.location.trim(),
        fault: data.fault?.trim() || "NOT_SPECIFIED",
        postAccidentTestDone: Boolean(data.postAccidentTestDone),
        notes: data.description?.trim() || null,
        status: (data.status as EventStatus) || "PENDING",
      },
      include: { driver: true, truck: true },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "CREATE", entityType: "Accident", entityId: accident.id },
    });

    revalidatePath("/safety/accidents");
    return accident;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

// ---- CARGO CLAIMS ----
export interface CargoClaimInput {
  driverId: string;
  truckId?: string;
  date: string;
  location: string;
  loadNumber: string;
  broker: string;
  claimNumber?: string;
  notes?: string;
  status?: string;
}

export async function getCargoClaims() {
  await requirePermission("safety.claims");
  return prisma.cargoClaim.findMany({
    include: { driver: true, truck: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function createCargoClaim(data: CargoClaimInput) {
  const user = await requirePermission("safety.claims");
  try {
    requireField(data.driverId, "Haydovchi");
    requireField(data.location, "Manzil");
    requireField(data.loadNumber, "Yuk (load) raqami");
    requireField(data.broker, "Broker");

    const claim = await prisma.cargoClaim.create({
      data: {
        driverId: data.driverId,
        truckId: data.truckId || null,
        location: data.location.trim(),
        loadNumber: data.loadNumber.trim(),
        broker: data.broker.trim(),
        claimNumber: data.claimNumber?.trim() || null,
        notes: data.notes?.trim() || null,
        date: new Date(data.date),
        status: (data.status as EventStatus) || "PENDING",
      },
      include: { driver: true, truck: true },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "CREATE", entityType: "CargoClaim", entityId: claim.id },
    });

    revalidatePath("/safety/cargo-claims");
    return claim;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

// ---- INSPECTIONS ----
export interface InspectionInput {
  driverId: string;
  truckId?: string;
  date: string;
  state: string;
  level: string | number;
  violations?: string;
  bonusOrPenalty?: string | number;
  status?: string;
  notes?: string;
}

export async function getInspections() {
  await requirePermission("safety.inspections");
  return prisma.inspection.findMany({
    include: { driver: true, truck: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function createInspection(data: InspectionInput) {
  const user = await requirePermission("safety.inspections");
  try {
    requireField(data.driverId, "Haydovchi");
    requireField(data.state, "Shtat");
    const level = Number(data.level);
    if (!Number.isInteger(level) || level < 1 || level > 7) {
      throw new ValidationError("Inspeksiya darajasi 1–7 orasida bo'lishi kerak.");
    }

    let bonus: number | null = null;
    if (data.bonusOrPenalty !== undefined && data.bonusOrPenalty !== "" && data.bonusOrPenalty !== null) {
      bonus = Number(data.bonusOrPenalty);
      if (Number.isNaN(bonus)) throw new ValidationError("Bonus/jarima summasi noto'g'ri.");
    }

    const inspection = await prisma.inspection.create({
      data: {
        driverId: data.driverId,
        truckId: data.truckId || null,
        date: new Date(data.date),
        state: data.state.trim(),
        level,
        violations: data.violations?.trim() || null,
        bonusOrPenalty: bonus,
        status: (data.status as InspectionStatus) || "PENDING_REVIEW",
        notes: data.notes?.trim() || null,
      },
      include: { driver: true, truck: true },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "CREATE", entityType: "Inspection", entityId: inspection.id },
    });

    revalidatePath("/safety/inspections");
    return inspection;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

// ---- DRIVER PROFILE (PRD 5.2) ----

/** Driver profili — barcha bog'liq compliance yozuvlari + joriy unit. */
export async function getDriverById(id: string) {
  await requireUser();
  return prisma.driver.findUnique({
    where: { id },
    include: {
      accidents: { include: { truck: true }, orderBy: { date: "desc" } },
      cargoClaims: { include: { truck: true }, orderBy: { date: "desc" } },
      inspections: { include: { truck: true }, orderBy: { date: "desc" } },
      insurances: { include: { truck: true } },
      assignments: { where: { isActive: true }, include: { truck: true, trailer: true } },
    },
  });
}

/** Berilgan entity uchun hujjatlar (driver profili DQ/CDL fayllari uchun). */
export async function getEntityDocuments(entityType: string, entityId: string) {
  await requireUser();
  return prisma.document.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
  });
}
