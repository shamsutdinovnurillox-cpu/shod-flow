"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission, requireAdmin } from "@/lib/auth-guard";
import { toUserMessage, requireField, ValidationError } from "@/lib/errors";
import { changedFields, writeAudit } from "@/lib/audit";

export interface ServiceInput {
  entityType: string; // "TRUCK" | "TRAILER"
  unitId: string;
  serviceDate: string;
  serviceType: string;
  shop: string;
  mechanic?: string;
  cost?: string | number;
  /** PRD 4.5: cost faqat rental/lessor to'laydigan xizmatda ixtiyoriy. */
  lessorPaid?: boolean;
  odometer?: string | number;
  arrivalTime?: string;
  description?: string;
}

function parseCost(v: string | number | undefined): number | null {
  if (v === undefined || v === "" || v === null) return null;
  const n = Number(v);
  if (Number.isNaN(n) || n < 0) throw new ValidationError("Narx noto'g'ri.");
  return n;
}

function parseOdometer(v: string | number | undefined): number | null {
  if (v === undefined || v === "" || v === null) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new ValidationError("Odometr qiymati noto'g'ri.");
  return n;
}

export async function getServices() {
  await requirePermission("fleet.services");
  return prisma.service.findMany({
    include: { truck: true, trailer: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createService(data: ServiceInput) {
  const user = await requirePermission("fleet.services");
  try {
    requireField(data.unitId, "Unit");
    requireField(data.serviceType, "Xizmat turi");
    requireField(data.shop, "Servis (shop)");

    const cost = parseCost(data.cost);
    // PRD 4.5: narx majburiy; faqat rental/lessor to'laydigan xizmatda bo'sh qoldirish mumkin.
    if (cost === null && !data.lessorPaid) {
      throw new ValidationError("Narx majburiy. Faqat rental/lessor to'laydigan xizmatda bo'sh qoldiriladi.");
    }

    const service = await prisma.service.create({
      data: {
        entityType: data.entityType,
        truckId: data.entityType === "TRUCK" ? data.unitId : null,
        trailerId: data.entityType === "TRAILER" ? data.unitId : null,
        serviceDate: new Date(data.serviceDate),
        serviceType: data.serviceType.trim(),
        shop: data.shop.trim(),
        mechanic: data.mechanic?.trim() || null,
        cost,
        odometer: data.entityType === "TRUCK" ? parseOdometer(data.odometer) : null,
        arrivalTime: data.arrivalTime ? new Date(data.arrivalTime) : null,
        description: data.description?.trim() || null,
      },
      include: { truck: true, trailer: true },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "CREATE", entityType: "Service", entityId: service.id },
    });

    revalidatePath("/fleet/services");
    return service;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

export interface ServiceUpdateInput {
  serviceDate?: string;
  serviceType?: string;
  shop?: string;
  mechanic?: string;
  cost?: string | number;
  odometer?: string | number;
  arrivalTime?: string;
  description?: string;
}

export async function updateService(id: string, data: ServiceUpdateInput) {
  const user = await requirePermission("fleet.services");
  try {
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Xizmat yozuvi topilmadi.");

    const patch = {
      serviceDate: data.serviceDate ? new Date(data.serviceDate) : undefined,
      serviceType: data.serviceType?.trim() || undefined,
      shop: data.shop?.trim() || undefined,
      mechanic: data.mechanic === undefined ? undefined : data.mechanic.trim() || null,
      cost: data.cost === undefined ? undefined : parseCost(data.cost),
      odometer: data.odometer === undefined ? undefined : parseOdometer(data.odometer),
      arrivalTime: data.arrivalTime === undefined ? undefined : data.arrivalTime ? new Date(data.arrivalTime) : null,
      description: data.description === undefined ? undefined : data.description.trim() || null,
    };

    const details = changedFields(existing, patch);
    const service = await prisma.service.update({
      where: { id },
      data: patch,
      include: { truck: true, trailer: true },
    });
    await writeAudit(prisma, { userId: user.id, action: "UPDATE", entityType: "Service", entityId: id, details });

    revalidatePath("/fleet/services");
    return service;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** Xizmatni yakunlaydi (PRD 4.5): status COMPLETED + tugash vaqti. */
export async function completeService(id: string, completionTime?: string) {
  const user = await requirePermission("fleet.services");
  try {
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Xizmat yozuvi topilmadi.");
    if (existing.status === "COMPLETED") throw new ValidationError("Xizmat allaqachon yakunlangan.");

    const service = await prisma.service.update({
      where: { id },
      data: { status: "COMPLETED", completionTime: completionTime ? new Date(completionTime) : new Date() },
      include: { truck: true, trailer: true },
    });
    await writeAudit(prisma, {
      userId: user.id, action: "STATUS_CHANGE", entityType: "Service", entityId: id,
      details: { status: { from: existing.status, to: "COMPLETED" } },
    });

    revalidatePath("/fleet/services");
    return service;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** Admin-only: xizmat yozuvini o'chirish. */
export async function deleteService(id: string) {
  const user = await requireAdmin();
  try {
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Xizmat yozuvi topilmadi.");
    await prisma.service.delete({ where: { id } });
    await writeAudit(prisma, {
      userId: user.id, action: "DELETE", entityType: "Service", entityId: id,
      details: { serviceType: existing.serviceType, shop: existing.shop, cost: existing.cost },
    });
    revalidatePath("/fleet/services");
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}
