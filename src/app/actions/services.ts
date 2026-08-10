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

/** Bitta xizmat yozuvi — detail sahifasi uchun (unit relation'lari bilan). */
export async function getServiceById(id: string) {
  await requirePermission("fleet.services");
  return prisma.service.findUnique({
    where: { id },
    include: { truck: true, trailer: true },
  });
}

/** Xizmat yozuvi bo'yicha audit tarixi — detail sahifasidagi "Activity". */
export async function getServiceAudit(id: string) {
  await requirePermission("fleet.services");
  return prisma.auditLog.findMany({
    where: { entityType: "Service", entityId: id },
    include: { user: true },
    orderBy: { timestamp: "desc" },
  });
}

/**
 * Formadan kelgan bitta yozuvni tekshiradi va Prisma `data` obyektiga aylantiradi.
 * createService va createServices (savat) shu yagona qoidalarni ishlatadi.
 */
function toCreateData(data: ServiceInput) {
  requireField(data.unitId, "Unit");
  requireField(data.serviceType, "Xizmat turi");
  requireField(data.shop, "Servis (shop)");

  const cost = parseCost(data.cost);
  // PRD 4.5: narx majburiy; faqat rental/lessor to'laydigan xizmatda bo'sh qoldirish mumkin.
  if (cost === null && !data.lessorPaid) {
    throw new ValidationError("Narx majburiy. Faqat rental/lessor to'laydigan xizmatda bo'sh qoldiriladi.");
  }

  return {
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
  };
}

export async function createService(data: ServiceInput) {
  const user = await requirePermission("fleet.services");
  try {
    const service = await prisma.service.create({
      data: toCreateData(data),
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

/**
 * Savatdagi bir nechta xizmatni bitta so'rovda yaratadi.
 *
 * Hammasi bitta tranzaksiyada: bitta yozuv tekshiruvdan o'tmasa, hech biri
 * saqlanmaydi — shunda savat qisman saqlanib qolmaydi.
 */
export async function createServices(items: ServiceInput[]) {
  const user = await requirePermission("fleet.services");
  try {
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError("Inline is empty — add at least one service.");
    }
    if (items.length > 50) {
      throw new ValidationError("Bir martada 50 tagacha xizmat saqlash mumkin.");
    }

    // Validatsiya tranzaksiyadan oldin — xato bo'lsa bazaga umuman tegilmaydi.
    const rows = items.map(toCreateData);

    const created = await prisma.$transaction(async (tx) => {
      const out = [];
      for (const data of rows) {
        const service = await tx.service.create({
          data,
          include: { truck: true, trailer: true },
        });
        await tx.auditLog.create({
          data: { userId: user.id, action: "CREATE", entityType: "Service", entityId: service.id },
        });
        out.push(service);
      }
      return out;
    });

    revalidatePath("/fleet/services");
    return created;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

export interface ServiceUpdateInput {
  /** Unit'ni ko'chirish uchun — ikkalasi birga berilishi kerak. */
  entityType?: string;
  unitId?: string;
  serviceDate?: string;
  serviceType?: string;
  shop?: string;
  mechanic?: string;
  cost?: string | number;
  /** PRD 4.5: rental/lessor to'laydigan xizmatda narx bo'sh qolishi mumkin. */
  lessorPaid?: boolean;
  odometer?: string | number;
  arrivalTime?: string;
  description?: string;
}

export async function updateService(id: string, data: ServiceUpdateInput) {
  const user = await requirePermission("fleet.services");
  try {
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Xizmat yozuvi topilmadi.");

    // Forma unit'ni ham tahrirlashga ruxsat beradi (noto'g'ri tanlangan
    // birlikni tuzatish uchun). Tur o'zgarsa, ikkala relation ham qayta
    // yoziladi — aks holda yozuv ikki birlikka bog'lanib qolardi.
    const entityType = data.entityType ?? existing.entityType;
    const movingUnit = data.unitId !== undefined && data.unitId !== "";
    if (movingUnit) requireField(data.unitId, "Unit");

    const cost = data.cost === undefined ? undefined : parseCost(data.cost);
    if (cost === null && !data.lessorPaid) {
      throw new ValidationError("Narx majburiy. Faqat rental/lessor to'laydigan xizmatda bo'sh qoldiriladi.");
    }

    const patch = {
      entityType: data.entityType ?? undefined,
      truckId: movingUnit ? (entityType === "TRUCK" ? data.unitId! : null) : undefined,
      trailerId: movingUnit ? (entityType === "TRAILER" ? data.unitId! : null) : undefined,
      serviceDate: data.serviceDate ? new Date(data.serviceDate) : undefined,
      serviceType: data.serviceType?.trim() || undefined,
      shop: data.shop?.trim() || undefined,
      mechanic: data.mechanic === undefined ? undefined : data.mechanic.trim() || null,
      cost,
      // Odometr faqat truck uchun mazmunli — trailerga ko'chirilsa tozalanadi.
      odometer:
        entityType !== "TRUCK"
          ? null
          : data.odometer === undefined
            ? undefined
            : parseOdometer(data.odometer),
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
