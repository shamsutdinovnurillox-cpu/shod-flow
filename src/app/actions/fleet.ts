"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUser, requirePermission, requireAdmin } from "@/lib/auth-guard";
import { toUserMessage, requireField, ValidationError } from "@/lib/errors";
import { changedFields, writeAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";
import type { OwnershipType, TrailerStatus } from "@prisma/client";

/** Bo'sh string → null, aks holda trim. Ixtiyoriy matn maydonlari uchun. */
function optText(v: string | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  const t = v.trim();
  return t === "" ? null : t;
}

/** Bo'sh string → null, aks holda Date. Noto'g'ri sana rad etiladi. */
function optDate(v: string | undefined, label: string): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v.trim() === "") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new ValidationError(`"${label}" sanasi noto'g'ri.`);
  return d;
}

/** Delete'da FK cheklovi xatosini tushunarli matnga aylantiradi. */
function deleteErrorMessage(e: unknown, what: string): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
    return `${what} bog'liq yozuvlari (tarix, xizmat, xarajat va h.k.) borligi uchun o'chirilmaydi. PRD bo'yicha tarix saqlanishi kerak.`;
  }
  return toUserMessage(e);
}

// ============================================================================
// FLEET actions. O'qish (trucks/trailers) — SHARED master data, har qanday
// login foydalanuvchi uchun. Yozish — faqat FLEET yoki ADMIN.
// ============================================================================

// ---- TRUCKS ----
export interface TruckInput {
  unitNumber: string;
  vin: string;
  licensePlate: string;
  make: string;
  year: string | number;
  ownershipType: string;
  location: string;
  notes?: string;
  registrationExpiry?: string;
  annualInspectionDate?: string;
}

export async function getTrucks() {
  await requireUser();
  return prisma.truck.findMany({ orderBy: { createdAt: "desc" } });
}

/**
 * Trucks ro'yxati uchun to'liq qator (TZ 4.2 jadval ustunlari):
 * joriy haydovchi + uning turi va olib ketish sanasi faol biriktiruvdan,
 * qurilma S/N lari esa Device jadvalidan keladi.
 */
export async function getTruckRows() {
  await requireUser();
  return prisma.truck.findMany({
    include: {
      assignments: { where: { isActive: true }, include: { driver: true }, take: 1 },
      devices: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTruck(data: TruckInput) {
  const user = await requirePermission("fleet.trucks");
  try {
    requireField(data.unitNumber, "Unit raqami");
    requireField(data.vin, "VIN");
    requireField(data.licensePlate, "Davlat raqami");
    requireField(data.make, "Marka");
    requireField(data.location, "Manzil");
    const year = Number(data.year);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      throw new ValidationError("Yil noto'g'ri (1900–2100).");
    }

    const truck = await prisma.truck.create({
      data: {
        unitNumber: data.unitNumber.trim(),
        vin: data.vin.trim(),
        licensePlate: data.licensePlate.trim(),
        make: data.make.trim(),
        year,
        ownershipType: data.ownershipType as OwnershipType,
        location: data.location.trim(),
        notes: data.notes?.trim() || null,
        registrationExpiry: optDate(data.registrationExpiry, "Registratsiya muddati") ?? null,
        annualInspectionDate: optDate(data.annualInspectionDate, "Yillik inspeksiya") ?? null,
      },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "CREATE", entityType: "Truck", entityId: truck.id },
    });

    revalidatePath("/fleet/trucks");
    return truck;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

export interface TruckUpdateInput {
  unitNumber?: string;
  vin?: string;
  licensePlate?: string;
  make?: string;
  year?: string | number;
  ownershipType?: string;
  location?: string;
  notes?: string;
  registrationExpiry?: string;
  annualInspectionDate?: string;
}

export async function updateTruck(id: string, data: TruckUpdateInput) {
  const user = await requirePermission("fleet.trucks");
  try {
    const existing = await prisma.truck.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Truck topilmadi.");

    let year: number | undefined;
    if (data.year !== undefined && data.year !== "") {
      year = Number(data.year);
      if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        throw new ValidationError("Yil noto'g'ri (1900–2100).");
      }
    }

    const patch = {
      unitNumber: data.unitNumber?.trim() || undefined,
      vin: data.vin?.trim() || undefined,
      licensePlate: data.licensePlate?.trim() || undefined,
      make: data.make?.trim() || undefined,
      year,
      ownershipType: data.ownershipType ? (data.ownershipType as OwnershipType) : undefined,
      location: data.location?.trim() || undefined,
      notes: optText(data.notes),
      registrationExpiry: optDate(data.registrationExpiry, "Registratsiya muddati"),
      annualInspectionDate: optDate(data.annualInspectionDate, "Yillik inspeksiya"),
    };

    const details = changedFields(existing, patch);
    const truck = await prisma.truck.update({ where: { id }, data: patch });
    await writeAudit(prisma, { userId: user.id, action: "UPDATE", entityType: "Truck", entityId: id, details });

    revalidatePath("/fleet/trucks");
    revalidatePath(`/fleet/trucks/${id}`);
    return truck;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** Admin-only: truck'ni o'chirish. Bog'liq tarixi bor bo'lsa rad etiladi (PRD: history saqlansin). */
export async function deleteTruck(id: string) {
  const user = await requireAdmin();
  try {
    const existing = await prisma.truck.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Truck topilmadi.");
    await prisma.truck.delete({ where: { id } });
    await writeAudit(prisma, {
      userId: user.id, action: "DELETE", entityType: "Truck", entityId: id,
      details: { unitNumber: existing.unitNumber, vin: existing.vin },
    });
    revalidatePath("/fleet/trucks");
  } catch (e) {
    throw new Error(deleteErrorMessage(e, "Truck"));
  }
}

// ---- TRAILERS ----
export interface TrailerInput {
  trailerNumber: string;
  vin: string;
  year: string | number;
  make: string;
  licensePlate: string;
  state: string;
  location: string;
  pickupDate: string;
  annualInspectionDate: string;
  notes?: string;
}

export async function getTrailers() {
  await requireUser();
  return prisma.trailer.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createTrailer(data: TrailerInput) {
  const user = await requirePermission("fleet.trailers");
  try {
    requireField(data.trailerNumber, "Trailer raqami");
    requireField(data.vin, "VIN");
    requireField(data.licensePlate, "Davlat raqami");
    requireField(data.state, "Shtat");
    requireField(data.location, "Manzil");
    const year = Number(data.year);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      throw new ValidationError("Yil noto'g'ri (1900–2100).");
    }

    const trailer = await prisma.trailer.create({
      data: {
        trailerNumber: data.trailerNumber.trim(),
        vin: data.vin.trim(),
        year,
        make: data.make.trim(),
        licensePlate: data.licensePlate.trim(),
        state: data.state.trim(),
        location: data.location.trim(),
        pickupDate: new Date(data.pickupDate),
        annualInspectionDate: new Date(data.annualInspectionDate),
        notes: data.notes?.trim() || null,
      },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "CREATE", entityType: "Trailer", entityId: trailer.id },
    });

    revalidatePath("/fleet/trailers");
    return trailer;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

export interface TrailerUpdateInput {
  trailerNumber?: string;
  vin?: string;
  year?: string | number;
  make?: string;
  licensePlate?: string;
  state?: string;
  location?: string;
  pickupDate?: string;
  annualInspectionDate?: string;
  notes?: string;
}

export async function updateTrailer(id: string, data: TrailerUpdateInput) {
  const user = await requirePermission("fleet.trailers");
  try {
    const existing = await prisma.trailer.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Trailer topilmadi.");

    let year: number | undefined;
    if (data.year !== undefined && data.year !== "") {
      year = Number(data.year);
      if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        throw new ValidationError("Yil noto'g'ri (1900–2100).");
      }
    }

    const patch = {
      trailerNumber: data.trailerNumber?.trim() || undefined,
      vin: data.vin?.trim() || undefined,
      year,
      make: data.make?.trim() || undefined,
      licensePlate: data.licensePlate?.trim() || undefined,
      state: data.state?.trim() || undefined,
      location: data.location?.trim() || undefined,
      pickupDate: data.pickupDate ? new Date(data.pickupDate) : undefined,
      annualInspectionDate: data.annualInspectionDate ? new Date(data.annualInspectionDate) : undefined,
      notes: optText(data.notes),
    };

    const details = changedFields(existing, patch);
    const trailer = await prisma.trailer.update({ where: { id }, data: patch });
    await writeAudit(prisma, { userId: user.id, action: "UPDATE", entityType: "Trailer", entityId: id, details });

    revalidatePath("/fleet/trailers");
    revalidatePath(`/fleet/trailers/${id}`);
    return trailer;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** Admin-only: trailer'ni o'chirish. Bog'liq tarixi bor bo'lsa rad etiladi. */
export async function deleteTrailer(id: string) {
  const user = await requireAdmin();
  try {
    const existing = await prisma.trailer.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Trailer topilmadi.");
    await prisma.trailer.delete({ where: { id } });
    await writeAudit(prisma, {
      userId: user.id, action: "DELETE", entityType: "Trailer", entityId: id,
      details: { trailerNumber: existing.trailerNumber, vin: existing.vin },
    });
    revalidatePath("/fleet/trailers");
  } catch (e) {
    throw new Error(deleteErrorMessage(e, "Trailer"));
  }
}

/** Trucks "History" ko'rinishi (PRD 4.2): yopilgan biriktiruvlar tarixi. */
export async function getTruckAssignmentHistory() {
  await requireUser();
  return prisma.assignment.findMany({
    where: { truckId: { not: null }, isActive: false },
    include: { driver: true, truck: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

// ---- TRUCK PROFILE + ASSIGNMENT WORKFLOW (PRD 4.2–4.3) ----

/** Truck profili — barcha bog'liq tarix bilan. */
export async function getTruckById(id: string) {
  await requireUser();
  return prisma.truck.findUnique({
    where: { id },
    include: {
      assignments: { include: { driver: true }, orderBy: { createdAt: "desc" } },
      services: { orderBy: { serviceDate: "desc" } },
      expenses: { orderBy: { date: "desc" } },
      devices: {
        include: { truck: true, assignments: { where: { isActive: true }, take: 1 } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/** Truck'ni haydovchiga biriktiradi → status ASSIGNED, tarixga yozuv. */
export async function assignTruck(input: { truckId: string; driverId: string; pickupDate: string }) {
  const user = await requirePermission("fleet.trucks");
  try {
    requireField(input.truckId, "Truck");
    requireField(input.driverId, "Haydovchi");

    await prisma.$transaction(async (tx) => {
      // Avvalgi faol biriktiruvni yopamiz.
      await tx.assignment.updateMany({
        where: { truckId: input.truckId, isActive: true },
        data: { isActive: false, dropoffDate: new Date() },
      });
      await tx.assignment.create({
        data: {
          truckId: input.truckId,
          driverId: input.driverId,
          pickupDate: new Date(input.pickupDate),
          isActive: true,
        },
      });
      await tx.truck.update({ where: { id: input.truckId }, data: { status: "ASSIGNED" } });
      await tx.auditLog.create({
        data: {
          userId: user.id, action: "ASSIGN", entityType: "Truck", entityId: input.truckId,
          details: { driverId: input.driverId, pickupDate: input.pickupDate },
        },
      });
    });

    revalidatePath(`/fleet/trucks/${input.truckId}`);
    revalidatePath("/fleet/trucks");
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/**
 * Move / Drop (PRD 4.2):
 *  - DROP_YARD:    Yard + kompaniyani tark etish → UNASSIGNED + tarix
 *  - DROP_SERVICE: Service + kompaniyani tark etish → IN_SERVICE + tarix
 *  - SERVICE_HOME: Service + uyga → IN_SERVICE, haydovchi konteksti saqlanadi
 */
export async function moveTruck(input: {
  truckId: string;
  mode: "DROP_YARD" | "DROP_SERVICE" | "SERVICE_HOME";
  location?: string;
  reason?: string;
  notes?: string;
}) {
  const user = await requirePermission("fleet.trucks");
  try {
    requireField(input.truckId, "Truck");

    const newStatus = input.mode === "DROP_YARD" ? "UNASSIGNED" : "IN_SERVICE";
    const closeAssignment = input.mode !== "SERVICE_HOME";

    await prisma.$transaction(async (tx) => {
      if (closeAssignment) {
        await tx.assignment.updateMany({
          where: { truckId: input.truckId, isActive: true },
          data: {
            isActive: false,
            dropoffDate: new Date(),
            location: input.location?.trim() || null,
            reason: input.reason?.trim() || null,
            notes: input.notes?.trim() || null,
          },
        });
      }
      await tx.truck.update({ where: { id: input.truckId }, data: { status: newStatus } });
      await tx.auditLog.create({
        data: {
          userId: user.id, action: "MOVE", entityType: "Truck", entityId: input.truckId,
          details: { mode: input.mode, newStatus, location: input.location ?? null, reason: input.reason ?? null },
        },
      });
    });

    revalidatePath(`/fleet/trucks/${input.truckId}`);
    revalidatePath("/fleet/trucks");
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

// ---- TRAILER PROFILE + WORKFLOW (PRD 4.4) ----

export async function getTrailerById(id: string) {
  await requireUser();
  return prisma.trailer.findUnique({
    where: { id },
    include: {
      assignments: { include: { driver: true }, orderBy: { createdAt: "desc" } },
      services: { orderBy: { serviceDate: "desc" } },
      expenses: { orderBy: { date: "desc" } },
    },
  });
}

/** Trailer'ni haydovchiga biriktiradi → status EMPTY, tarixga yozuv. */
export async function assignTrailer(input: { trailerId: string; driverId: string; pickupDate: string }) {
  const user = await requirePermission("fleet.trailers");
  try {
    requireField(input.trailerId, "Trailer");
    requireField(input.driverId, "Haydovchi");

    await prisma.$transaction(async (tx) => {
      await tx.assignment.updateMany({
        where: { trailerId: input.trailerId, isActive: true },
        data: { isActive: false, dropoffDate: new Date() },
      });
      await tx.assignment.create({
        data: {
          trailerId: input.trailerId,
          driverId: input.driverId,
          pickupDate: new Date(input.pickupDate),
          isActive: true,
        },
      });
      await tx.trailer.update({ where: { id: input.trailerId }, data: { status: "EMPTY" } });
      await tx.auditLog.create({
        data: {
          userId: user.id, action: "ASSIGN", entityType: "Trailer", entityId: input.trailerId,
          details: { driverId: input.driverId, pickupDate: input.pickupDate },
        },
      });
    });

    revalidatePath(`/fleet/trailers/${input.trailerId}`);
    revalidatePath("/fleet/trailers");
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** Drop — faol biriktiruvni yopadi (manzil/sabab bilan) → status UNASSIGNED. */
export async function dropTrailer(input: { trailerId: string; location?: string; reason?: string; notes?: string }) {
  const user = await requirePermission("fleet.trailers");
  try {
    requireField(input.trailerId, "Trailer");

    await prisma.$transaction(async (tx) => {
      await tx.assignment.updateMany({
        where: { trailerId: input.trailerId, isActive: true },
        data: {
          isActive: false,
          dropoffDate: new Date(),
          location: input.location?.trim() || null,
          reason: input.reason?.trim() || null,
          notes: input.notes?.trim() || null,
        },
      });
      await tx.trailer.update({ where: { id: input.trailerId }, data: { status: "UNASSIGNED" } });
      await tx.auditLog.create({
        data: {
          userId: user.id, action: "DROP", entityType: "Trailer", entityId: input.trailerId,
          details: { location: input.location ?? null, reason: input.reason ?? null },
        },
      });
    });

    revalidatePath(`/fleet/trailers/${input.trailerId}`);
    revalidatePath("/fleet/trailers");
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** Trailer cargo statusini yangilaydi (Empty/Booked/Lane/Service/Loaded). */
export async function setTrailerStatus(input: { trailerId: string; status: string }) {
  const user = await requirePermission("fleet.trailers");
  try {
    requireField(input.trailerId, "Trailer");
    const existing = await prisma.trailer.findUnique({ where: { id: input.trailerId } });
    if (!existing) throw new ValidationError("Trailer topilmadi.");
    await prisma.trailer.update({
      where: { id: input.trailerId },
      data: { status: input.status as TrailerStatus },
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id, action: "STATUS_CHANGE", entityType: "Trailer", entityId: input.trailerId,
        details: { status: { from: existing.status, to: input.status } },
      },
    });
    revalidatePath(`/fleet/trailers/${input.trailerId}`);
    revalidatePath("/fleet/trailers");
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}
