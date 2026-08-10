"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUser, requirePermission, requireAdmin } from "@/lib/auth-guard";
import { toUserMessage, requireField, ValidationError } from "@/lib/errors";
import { changedFields, writeAudit } from "@/lib/audit";
import type { InsuranceType, InsuranceStatus, EventStatus, InspectionStatus, DriverType, DriverStatus } from "@prisma/client";

const DRIVER_TYPES: DriverType[] = ["COMPANY", "OWNER_OPERATOR", "LEASE_PURCHASE"];

/** Haydovchi turini tekshiradi (Company / Owner operator / Lease purchase). */
function parseDriverType(v: string | undefined): DriverType | undefined {
  if (v === undefined || v === "") return undefined;
  if (!DRIVER_TYPES.includes(v as DriverType)) {
    throw new ValidationError("Haydovchi turi noto'g'ri.");
  }
  return v as DriverType;
}

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
  driverType?: string;
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
        driverType: parseDriverType(data.driverType) ?? "COMPANY",
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

export interface DriverUpdateInput {
  firstName?: string;
  lastName?: string;
  dob?: string;
  cdlNumber?: string;
  cdlState?: string;
  cdlIssueDate?: string;
  cdlExpiryDate?: string;
  medCardExpiryDate?: string;
  hireDate?: string;
  driverType?: string;
  notes?: string;
}

export async function updateDriver(id: string, data: DriverUpdateInput) {
  const user = await requirePermission("safety.drivers");
  try {
    const existing = await prisma.driver.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Haydovchi topilmadi.");

    const patch = {
      firstName: data.firstName?.trim() || undefined,
      lastName: data.lastName?.trim() || undefined,
      dob: data.dob ? new Date(data.dob) : undefined,
      cdlNumber: data.cdlNumber?.trim() || undefined,
      cdlState: data.cdlState?.trim() || undefined,
      cdlIssueDate: data.cdlIssueDate ? new Date(data.cdlIssueDate) : undefined,
      cdlExpiryDate: data.cdlExpiryDate ? new Date(data.cdlExpiryDate) : undefined,
      medCardExpiryDate: data.medCardExpiryDate ? new Date(data.medCardExpiryDate) : undefined,
      hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
      driverType: parseDriverType(data.driverType),
      notes: data.notes === undefined ? undefined : data.notes.trim() || null,
    };

    const details = changedFields(existing, patch);
    const driver = await prisma.driver.update({ where: { id }, data: patch });
    await writeAudit(prisma, { userId: user.id, action: "UPDATE", entityType: "Driver", entityId: id, details });

    revalidatePath("/safety/drivers");
    revalidatePath(`/safety/drivers/${id}`);
    return driver;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** Haydovchini ishdan bo'shatish (PRD 5.2): status TERMINATED + sana. */
export async function terminateDriver(id: string, terminationDate?: string) {
  const user = await requirePermission("safety.drivers");
  try {
    const existing = await prisma.driver.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Haydovchi topilmadi.");
    if (existing.status === "TERMINATED") throw new ValidationError("Haydovchi allaqachon bo'shatilgan.");

    const driver = await prisma.driver.update({
      where: { id },
      data: { status: "TERMINATED", terminationDate: terminationDate ? new Date(terminationDate) : new Date() },
    });
    await writeAudit(prisma, {
      userId: user.id, action: "STATUS_CHANGE", entityType: "Driver", entityId: id,
      details: { status: { from: "ACTIVE", to: "TERMINATED" } },
    });

    revalidatePath("/safety/drivers");
    revalidatePath(`/safety/drivers/${id}`);
    return driver;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** Bo'shatilgan haydovchini qayta faollashtirish. */
export async function reactivateDriver(id: string) {
  const user = await requirePermission("safety.drivers");
  try {
    const existing = await prisma.driver.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Haydovchi topilmadi.");
    if (existing.status === "ACTIVE") throw new ValidationError("Haydovchi allaqachon faol.");

    const driver = await prisma.driver.update({
      where: { id },
      data: { status: "ACTIVE", terminationDate: null },
    });
    await writeAudit(prisma, {
      userId: user.id, action: "STATUS_CHANGE", entityType: "Driver", entityId: id,
      details: { status: { from: "TERMINATED", to: "ACTIVE" } },
    });

    revalidatePath("/safety/drivers");
    revalidatePath(`/safety/drivers/${id}`);
    return driver;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/**
 * Haydovchi holatini o'rnatadi (Active / On Leave / Terminated).
 * TERMINATED bo'lganda sana yoziladi, boshqasiga qaytganda tozalanadi.
 */
export async function setDriverStatus(id: string, status: string, date?: string) {
  const user = await requirePermission("safety.drivers");
  try {
    const valid: DriverStatus[] = ["ACTIVE", "ON_LEAVE", "TERMINATED"];
    if (!valid.includes(status as DriverStatus)) throw new ValidationError("Holat noto'g'ri.");

    const existing = await prisma.driver.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Haydovchi topilmadi.");
    if (existing.status === status) throw new ValidationError("Haydovchi allaqachon shu holatda.");

    const driver = await prisma.driver.update({
      where: { id },
      data: {
        status: status as DriverStatus,
        terminationDate:
          status === "TERMINATED" ? (date ? new Date(date) : new Date()) : null,
      },
    });
    await writeAudit(prisma, {
      userId: user.id, action: "STATUS_CHANGE", entityType: "Driver", entityId: id,
      details: { status: { from: existing.status, to: status } },
    });

    revalidatePath("/safety/drivers");
    revalidatePath(`/safety/drivers/${id}`);
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

// PRD 5.3: Active birinchi, Removed eng pastda, Rejected aniq ko'rinsin.
const INSURANCE_STATUS_RANK: Record<InsuranceStatus, number> = {
  ACTIVE: 0,
  MISSING: 1,
  EXPIRED: 2,
  REJECTED: 3,
  REMOVED: 4,
};

export async function getInsurances() {
  await requirePermission("safety.insurance");
  const insurances = await prisma.insurance.findMany({
    include: { driver: true, truck: true },
    orderBy: { createdAt: "desc" },
  });
  return insurances.sort(
    (a, b) => INSURANCE_STATUS_RANK[a.status] - INSURANCE_STATUS_RANK[b.status],
  );
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

/** Sug'urta statusini o'zgartiradi (PRD 5.3): ACTIVE/REMOVED/REJECTED/EXPIRED/MISSING. */
export async function setInsuranceStatus(id: string, status: InsuranceStatus, rejectionNotes?: string) {
  const user = await requirePermission("safety.insurance");
  try {
    const existing = await prisma.insurance.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Sug'urta yozuvi topilmadi.");
    if (status === "REJECTED") requireField(rejectionNotes, "Rad etish sababi");

    const insurance = await prisma.insurance.update({
      where: { id },
      data: {
        status,
        rejectionNotes: status === "REJECTED" ? rejectionNotes!.trim() : existing.rejectionNotes,
      },
      include: { driver: true, truck: true },
    });
    await writeAudit(prisma, {
      userId: user.id, action: "STATUS_CHANGE", entityType: "Insurance", entityId: id,
      details: { status: { from: existing.status, to: status } },
    });

    revalidatePath("/safety/insurance");
    return insurance;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

export async function updateInsurance(id: string, data: { endDate?: string }) {
  const user = await requirePermission("safety.insurance");
  try {
    const existing = await prisma.insurance.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Sug'urta yozuvi topilmadi.");

    const patch = {
      expiryDate: data.endDate === undefined ? undefined : data.endDate ? new Date(data.endDate) : null,
    };
    const details = changedFields(existing, patch);
    const insurance = await prisma.insurance.update({
      where: { id },
      data: patch,
      include: { driver: true, truck: true },
    });
    await writeAudit(prisma, { userId: user.id, action: "UPDATE", entityType: "Insurance", entityId: id, details });

    revalidatePath("/safety/insurance");
    return insurance;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** Admin-only: sug'urta yozuvini o'chirish. */
export async function deleteInsurance(id: string) {
  const user = await requireAdmin();
  try {
    const existing = await prisma.insurance.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Sug'urta yozuvi topilmadi.");
    await prisma.insurance.delete({ where: { id } });
    await writeAudit(prisma, {
      userId: user.id, action: "DELETE", entityType: "Insurance", entityId: id,
      details: { type: existing.type, status: existing.status },
    });
    revalidatePath("/safety/insurance");
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
  claimNumber?: string;
  adjuster?: string;
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
        claimNumber: data.claimNumber?.trim() || null,
        adjuster: data.adjuster?.trim() || null,
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

export interface AccidentUpdateInput {
  truckId?: string;
  date?: string;
  location?: string;
  fault?: string;
  postAccidentTestDone?: boolean;
  claimNumber?: string;
  adjuster?: string;
  notes?: string;
}

export async function updateAccident(id: string, data: AccidentUpdateInput) {
  const user = await requirePermission("safety.accidents");
  try {
    const existing = await prisma.accident.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Avariya yozuvi topilmadi.");

    const patch = {
      truckId: data.truckId === undefined ? undefined : data.truckId || null,
      date: data.date ? new Date(data.date) : undefined,
      location: data.location?.trim() || undefined,
      fault: data.fault?.trim() || undefined,
      postAccidentTestDone: data.postAccidentTestDone,
      claimNumber: data.claimNumber === undefined ? undefined : data.claimNumber.trim() || null,
      adjuster: data.adjuster === undefined ? undefined : data.adjuster.trim() || null,
      notes: data.notes === undefined ? undefined : data.notes.trim() || null,
    };

    const details = changedFields(existing, patch);
    const accident = await prisma.accident.update({
      where: { id },
      data: patch,
      include: { driver: true, truck: true },
    });
    await writeAudit(prisma, { userId: user.id, action: "UPDATE", entityType: "Accident", entityId: id, details });

    revalidatePath("/safety/accidents");
    revalidatePath(`/safety/accidents/${id}`);
    return accident;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** Avariya statusini o'zgartiradi (PENDING ↔ CLOSED). */
export async function setAccidentStatus(id: string, status: EventStatus) {
  const user = await requirePermission("safety.accidents");
  try {
    const existing = await prisma.accident.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Avariya yozuvi topilmadi.");

    const accident = await prisma.accident.update({
      where: { id },
      data: { status },
      include: { driver: true, truck: true },
    });
    await writeAudit(prisma, {
      userId: user.id, action: "STATUS_CHANGE", entityType: "Accident", entityId: id,
      details: { status: { from: existing.status, to: status } },
    });

    revalidatePath("/safety/accidents");
    revalidatePath(`/safety/accidents/${id}`);
    return accident;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** Admin-only: avariya yozuvini o'chirish. */
export async function deleteAccident(id: string) {
  const user = await requireAdmin();
  try {
    const existing = await prisma.accident.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Avariya yozuvi topilmadi.");
    await prisma.accident.delete({ where: { id } });
    await writeAudit(prisma, {
      userId: user.id, action: "DELETE", entityType: "Accident", entityId: id,
      details: { date: existing.date.toISOString(), location: existing.location },
    });
    revalidatePath("/safety/accidents");
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
  adjuster?: string;
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
        adjuster: data.adjuster?.trim() || null,
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

export interface CargoClaimUpdateInput {
  truckId?: string;
  date?: string;
  location?: string;
  loadNumber?: string;
  broker?: string;
  claimNumber?: string;
  adjuster?: string;
  notes?: string;
}

export async function updateCargoClaim(id: string, data: CargoClaimUpdateInput) {
  const user = await requirePermission("safety.claims");
  try {
    const existing = await prisma.cargoClaim.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Cargo claim topilmadi.");

    const patch = {
      truckId: data.truckId === undefined ? undefined : data.truckId || null,
      date: data.date ? new Date(data.date) : undefined,
      location: data.location?.trim() || undefined,
      loadNumber: data.loadNumber?.trim() || undefined,
      broker: data.broker?.trim() || undefined,
      claimNumber: data.claimNumber === undefined ? undefined : data.claimNumber.trim() || null,
      adjuster: data.adjuster === undefined ? undefined : data.adjuster.trim() || null,
      notes: data.notes === undefined ? undefined : data.notes.trim() || null,
    };

    const details = changedFields(existing, patch);
    const claim = await prisma.cargoClaim.update({
      where: { id },
      data: patch,
      include: { driver: true, truck: true },
    });
    await writeAudit(prisma, { userId: user.id, action: "UPDATE", entityType: "CargoClaim", entityId: id, details });

    revalidatePath("/safety/cargo-claims");
    revalidatePath(`/safety/cargo-claims/${id}`);
    return claim;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** Cargo claim statusini o'zgartiradi (PENDING ↔ CLOSED). */
export async function setCargoClaimStatus(id: string, status: EventStatus) {
  const user = await requirePermission("safety.claims");
  try {
    const existing = await prisma.cargoClaim.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Cargo claim topilmadi.");

    const claim = await prisma.cargoClaim.update({
      where: { id },
      data: { status },
      include: { driver: true, truck: true },
    });
    await writeAudit(prisma, {
      userId: user.id, action: "STATUS_CHANGE", entityType: "CargoClaim", entityId: id,
      details: { status: { from: existing.status, to: status } },
    });

    revalidatePath("/safety/cargo-claims");
    revalidatePath(`/safety/cargo-claims/${id}`);
    return claim;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** Admin-only: cargo claim'ni o'chirish. */
export async function deleteCargoClaim(id: string) {
  const user = await requireAdmin();
  try {
    const existing = await prisma.cargoClaim.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Cargo claim topilmadi.");
    await prisma.cargoClaim.delete({ where: { id } });
    await writeAudit(prisma, {
      userId: user.id, action: "DELETE", entityType: "CargoClaim", entityId: id,
      details: { loadNumber: existing.loadNumber, claimNumber: existing.claimNumber },
    });
    revalidatePath("/safety/cargo-claims");
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

// Prisma enum bo'yicha e'lon tartibida saralaydi (CLEAN, VIOLATION, PENDING_REVIEW,
// CLOSED), PRD esa pending'lar birinchi turishini talab qiladi — shuning uchun JS'da.
const INSPECTION_STATUS_RANK: Record<InspectionStatus, number> = {
  PENDING_REVIEW: 0,
  VIOLATION: 1,
  CLEAN: 2,
  CLOSED: 3,
};

export async function getInspections() {
  await requirePermission("safety.inspections");
  const inspections = await prisma.inspection.findMany({
    include: { driver: true, truck: true },
    orderBy: { createdAt: "desc" },
  });
  return inspections.sort(
    (a, b) => INSPECTION_STATUS_RANK[a.status] - INSPECTION_STATUS_RANK[b.status],
  );
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

export interface InspectionUpdateInput {
  truckId?: string;
  date?: string;
  state?: string;
  level?: string | number;
  violations?: string;
  bonusOrPenalty?: string | number;
  notes?: string;
}

export async function updateInspection(id: string, data: InspectionUpdateInput) {
  const user = await requirePermission("safety.inspections");
  try {
    const existing = await prisma.inspection.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Inspeksiya topilmadi.");

    let level: number | undefined;
    if (data.level !== undefined && data.level !== "") {
      level = Number(data.level);
      if (!Number.isInteger(level) || level < 1 || level > 7) {
        throw new ValidationError("Inspeksiya darajasi 1–7 orasida bo'lishi kerak.");
      }
    }
    let bonus: number | null | undefined;
    if (data.bonusOrPenalty !== undefined) {
      if (data.bonusOrPenalty === "" || data.bonusOrPenalty === null) bonus = null;
      else {
        bonus = Number(data.bonusOrPenalty);
        if (Number.isNaN(bonus)) throw new ValidationError("Bonus/jarima summasi noto'g'ri.");
      }
    }

    const patch = {
      truckId: data.truckId === undefined ? undefined : data.truckId || null,
      date: data.date ? new Date(data.date) : undefined,
      state: data.state?.trim() || undefined,
      level,
      violations: data.violations === undefined ? undefined : data.violations.trim() || null,
      bonusOrPenalty: bonus,
      notes: data.notes === undefined ? undefined : data.notes.trim() || null,
    };

    const details = changedFields(existing, patch);
    const inspection = await prisma.inspection.update({
      where: { id },
      data: patch,
      include: { driver: true, truck: true },
    });
    await writeAudit(prisma, { userId: user.id, action: "UPDATE", entityType: "Inspection", entityId: id, details });

    revalidatePath("/safety/inspections");
    revalidatePath(`/safety/inspections/${id}`);
    return inspection;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** Inspeksiya statusini o'zgartiradi (CLEAN/VIOLATION/PENDING_REVIEW/CLOSED). */
export async function setInspectionStatus(id: string, status: InspectionStatus) {
  const user = await requirePermission("safety.inspections");
  try {
    const existing = await prisma.inspection.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Inspeksiya topilmadi.");

    const inspection = await prisma.inspection.update({
      where: { id },
      data: { status },
      include: { driver: true, truck: true },
    });
    await writeAudit(prisma, {
      userId: user.id, action: "STATUS_CHANGE", entityType: "Inspection", entityId: id,
      details: { status: { from: existing.status, to: status } },
    });

    revalidatePath("/safety/inspections");
    revalidatePath(`/safety/inspections/${id}`);
    return inspection;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** Admin-only: inspeksiyani o'chirish. */
export async function deleteInspection(id: string) {
  const user = await requireAdmin();
  try {
    const existing = await prisma.inspection.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Inspeksiya topilmadi.");
    await prisma.inspection.delete({ where: { id } });
    await writeAudit(prisma, {
      userId: user.id, action: "DELETE", entityType: "Inspection", entityId: id,
      details: { date: existing.date.toISOString(), state: existing.state, level: existing.level },
    });
    revalidatePath("/safety/inspections");
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

// ---- DETAIL GETTERLAR (PRD 5.4–5.6: detail sahifalar) ----

export async function getAccidentById(id: string) {
  await requirePermission("safety.accidents");
  return prisma.accident.findUnique({
    where: { id },
    include: { driver: true, truck: true },
  });
}

export async function getCargoClaimById(id: string) {
  await requirePermission("safety.claims");
  return prisma.cargoClaim.findUnique({
    where: { id },
    include: { driver: true, truck: true },
  });
}

export async function getInspectionById(id: string) {
  await requirePermission("safety.inspections");
  return prisma.inspection.findUnique({
    where: { id },
    include: { driver: true, truck: true },
  });
}

/** Bitta yozuvning audit tarixi (detail sahifadagi timeline uchun). */
export async function getEntityAuditLogs(entityType: string, entityId: string) {
  await requireUser();
  return prisma.auditLog.findMany({
    where: { entityType, entityId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { timestamp: "desc" },
    take: 50,
  });
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

/**
 * Berilgan entity uchun hujjatlar (driver profili DQ/CDL fayllari, detail
 * sahifalar). entityId berilmasa — shu turdagi barcha hujjatlar (masalan,
 * insurance ro'yxatidagi COI ustuni uchun).
 */
export async function getEntityDocuments(entityType: string, entityId?: string) {
  await requireUser();
  return prisma.document.findMany({
    where: { entityType, ...(entityId ? { entityId } : {}) },
    orderBy: { createdAt: "desc" },
  });
}
