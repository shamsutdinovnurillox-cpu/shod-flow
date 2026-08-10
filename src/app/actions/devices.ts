"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUser, requirePermission } from "@/lib/auth-guard";
import { toUserMessage, requireField, ValidationError } from "@/lib/errors";
import { changedFields, writeAudit } from "@/lib/audit";
import type { DeviceCondition, DeviceType } from "@prisma/client";

// ============================================================================
// DEVICES (qurilmalar reyestri). O'qish — har qanday login foydalanuvchi
// (truck profilida ham ko'rinadi). Yozish — fleet.devices moduliga ruxsat.
// ============================================================================

const CONDITIONS: DeviceCondition[] = ["NEW", "USED", "OLD"];
const TYPES: DeviceType[] = ["MOTIVE_GATEWAY", "CAMERA", "PREPASS", "ELD_PT30", "TABLET", "CHAINS", "OTHER"];

/** Bo'sh string → null, aks holda trim. */
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

function parseCondition(v: string | undefined, required: boolean): DeviceCondition | undefined {
  if (v === undefined || v === "") {
    if (required) throw new ValidationError('"Holati" majburiy maydon.');
    return undefined;
  }
  if (!CONDITIONS.includes(v as DeviceCondition)) {
    throw new ValidationError("Holati noto'g'ri (Yangi / Ishlatilgan / Eski).");
  }
  return v as DeviceCondition;
}

function parseType(v: string | undefined, required: boolean): DeviceType | undefined {
  if (v === undefined || v === "") {
    if (required) throw new ValidationError('"Turi" majburiy maydon.');
    return undefined;
  }
  if (!TYPES.includes(v as DeviceType)) throw new ValidationError("Qurilma turi noto'g'ri.");
  return v as DeviceType;
}

/** Xato xabarlarida sana — UTC'da (saqlanish formati bilan bir xil). */
function fmtUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Majburiy sana — bo'lmasa yoki noto'g'ri bo'lsa xato. */
function reqDate(v: string | undefined, label: string): Date {
  requireField(v, label);
  const d = new Date(v as string);
  if (Number.isNaN(d.getTime())) throw new ValidationError(`"${label}" sanasi noto'g'ri.`);
  return d;
}

export interface DeviceInput {
  name: string;
  type: string;
  serialNumber?: string;
  vin?: string;
  expiryDate?: string;
  condition: string;
  truckId?: string;
  installedAt?: string; // truck tanlangan bo'lsa majburiy
  notes?: string;
}

/** Truck bu yerda o'zgarmaydi — buning uchun changeDeviceTruck ishlatiladi. */
export interface DeviceUpdateInput {
  name?: string;
  type?: string;
  serialNumber?: string;
  vin?: string;
  expiryDate?: string;
  condition?: string;
  notes?: string;
}

/** Barcha qurilmalar (truck va joriy biriktiruv bilan). Ro'yxat sahifasi uchun. */
export async function getDevices() {
  await requireUser();
  return prisma.device.findMany({
    include: {
      truck: true,
      assignments: { where: { isActive: true }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Bitta truck'ga biriktirilgan qurilmalar. */
export async function getDevicesByTruck(truckId: string) {
  await requireUser();
  return prisma.device.findMany({
    where: { truckId },
    include: { truck: true, assignments: { where: { isActive: true }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
}

/** Qurilma profili — to'liq biriktiruv tarixi bilan. */
export async function getDeviceById(id: string) {
  await requireUser();
  return prisma.device.findUnique({
    where: { id },
    include: {
      truck: true,
      assignments: {
        include: { truck: true },
        orderBy: [{ installedAt: "desc" }, { createdAt: "desc" }],
      },
    },
  });
}

/** Truck profili uchun qurilma tarixi — o'rnatilgan va yechilganlar. */
export async function getDeviceAssignmentsByTruck(truckId: string) {
  await requireUser();
  return prisma.deviceAssignment.findMany({
    where: { truckId },
    include: { device: true, truck: true },
    orderBy: [{ isActive: "desc" }, { installedAt: "desc" }],
  });
}

/** Qurilmani o'chirilgan paths — truck profili ham yangilanishi kerak. */
function revalidateDevice(truckId?: string | null) {
  revalidatePath("/fleet/devices");
  if (truckId) {
    revalidatePath(`/fleet/trucks/${truckId}`);
    revalidatePath("/fleet/trucks");
  }
}

export async function createDevice(data: DeviceInput) {
  const user = await requirePermission("fleet.devices");
  try {
    requireField(data.name, "Nomi");
    const condition = parseCondition(data.condition, true)!;
    const type = parseType(data.type, true)!;
    const truckId = data.truckId?.trim() || null;
    // Truck tanlangan bo'lsa — o'rnatish sanasi majburiy (tarix uchun kerak).
    const installedAt = truckId ? reqDate(data.installedAt, "O'rnatilgan sana") : null;

    const device = await prisma.$transaction(async (tx) => {
      const created = await tx.device.create({
        data: {
          name: data.name.trim(),
          type,
          serialNumber: data.serialNumber?.trim() || null,
          vin: data.vin?.trim() || null,
          expiryDate: optDate(data.expiryDate, "Muddati") ?? null,
          condition,
          truckId,
          notes: data.notes?.trim() || null,
        },
      });
      if (truckId && installedAt) {
        await tx.deviceAssignment.create({
          data: { deviceId: created.id, truckId, installedAt, isActive: true },
        });
      }
      return tx.device.findUniqueOrThrow({
        where: { id: created.id },
        include: { truck: true, assignments: { where: { isActive: true }, take: 1 } },
      });
    });

    await writeAudit(prisma, {
      userId: user.id, action: "CREATE", entityType: "Device", entityId: device.id,
      details: { name: device.name, truckId: device.truckId, installedAt: installedAt?.toISOString() ?? null },
    });

    revalidateDevice(device.truckId);
    return device;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/**
 * Qurilmani boshqa truck'ga ko'chiradi (yoki omborga qaytaradi).
 *
 * Tarix uchun sana majburiy: eski biriktiruv shu sanada yopiladi, yangisi
 * shu sanada boshlanadi — natijada "qaysi sanadan qaysi sanagacha qaysi
 * truckda bo'lgan" savoliga javob bo'ladi.
 */
export async function changeDeviceTruck(input: {
  deviceId: string;
  truckId?: string;
  date: string;
  notes?: string;
}) {
  const user = await requirePermission("fleet.devices");
  try {
    requireField(input.deviceId, "Qurilma");
    const date = reqDate(input.date, "Sana");
    const newTruckId = input.truckId?.trim() || null;

    const existing = await prisma.device.findUnique({
      where: { id: input.deviceId },
      // Faol yozuv + oxirgi yopilgani — ikkalasi ham sana tekshiruvi uchun kerak.
      include: { assignments: { orderBy: { installedAt: "desc" } } },
    });
    if (!existing) throw new ValidationError("Qurilma topilmadi.");
    if ((existing.truckId ?? null) === newTruckId) {
      throw new ValidationError("Qurilma allaqachon shu joyda.");
    }

    // Sana tarixni orqaga surib yubormasligi kerak — aks holda bitta qurilma
    // ikki truckda bir vaqtda turgandek ko'rinadi.
    const current = existing.assignments.find((a) => a.isActive);
    if (current) {
      if (date < current.installedAt) {
        throw new ValidationError(
          `Sana joriy o'rnatilgan sanadan (${fmtUtcDate(current.installedAt)}) oldin bo'lishi mumkin emas.`,
        );
      }
    } else {
      // Omborda turgan qurilma: oxirgi yechib olingan sanadan oldin qayta
      // o'rnatib bo'lmaydi (biriktiruvlar ustma-ust tushmasligi uchun).
      const lastRemoved = existing.assignments
        .filter((a) => a.removedAt !== null)
        .reduce<Date | null>((max, a) => (!max || a.removedAt! > max ? a.removedAt! : max), null);
      if (lastRemoved && date < lastRemoved) {
        throw new ValidationError(
          `Sana oxirgi yechib olingan sanadan (${fmtUtcDate(lastRemoved)}) oldin bo'lishi mumkin emas.`,
        );
      }
    }

    let newTruckVin: string | null = null;
    if (newTruckId) {
      const truck = await prisma.truck.findUnique({ where: { id: newTruckId } });
      if (!truck) throw new ValidationError("Tanlangan truck topilmadi.");
      newTruckVin = truck.vin;
    }

    const device = await prisma.$transaction(async (tx) => {
      // Eski biriktiruvni yopamiz.
      await tx.deviceAssignment.updateMany({
        where: { deviceId: input.deviceId, isActive: true },
        data: { isActive: false, removedAt: date, notes: input.notes?.trim() || null },
      });
      if (newTruckId) {
        await tx.deviceAssignment.create({
          data: { deviceId: input.deviceId, truckId: newTruckId, installedAt: date, isActive: true },
        });
      }
      await tx.device.update({
        where: { id: input.deviceId },
        // VIN qurilma o'rnatilgan truck VIN'ini bildiradi — u ham ko'chadi.
        data: { truckId: newTruckId, vin: newTruckVin },
      });
      return tx.device.findUniqueOrThrow({
        where: { id: input.deviceId },
        include: { truck: true, assignments: { where: { isActive: true }, take: 1 } },
      });
    });

    await writeAudit(prisma, {
      userId: user.id, action: "MOVE", entityType: "Device", entityId: input.deviceId,
      details: { truckId: { from: existing.truckId, to: newTruckId }, date: date.toISOString() },
    });

    revalidateDevice(existing.truckId);
    revalidateDevice(newTruckId);
    revalidatePath(`/fleet/devices/${input.deviceId}`);
    return device;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

export async function updateDevice(id: string, data: DeviceUpdateInput) {
  const user = await requirePermission("fleet.devices");
  try {
    const existing = await prisma.device.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Qurilma topilmadi.");

    const patch = {
      name: data.name?.trim() || undefined,
      type: parseType(data.type, false),
      serialNumber: optText(data.serialNumber),
      vin: optText(data.vin),
      expiryDate: optDate(data.expiryDate, "Muddati"),
      condition: parseCondition(data.condition, false),
      notes: optText(data.notes),
    };

    const details = changedFields(existing, patch);
    const device = await prisma.device.update({
      where: { id },
      data: patch,
      include: { truck: true, assignments: { where: { isActive: true }, take: 1 } },
    });
    await writeAudit(prisma, { userId: user.id, action: "UPDATE", entityType: "Device", entityId: id, details });

    revalidateDevice(device.truckId);
    revalidatePath(`/fleet/devices/${id}`);
    return device;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

export async function deleteDevice(id: string) {
  const user = await requirePermission("fleet.devices");
  try {
    const existing = await prisma.device.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Qurilma topilmadi.");

    await prisma.device.delete({ where: { id } });
    await writeAudit(prisma, {
      userId: user.id, action: "DELETE", entityType: "Device", entityId: id,
      details: { name: existing.name, vin: existing.vin },
    });

    revalidateDevice(existing.truckId);
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}
