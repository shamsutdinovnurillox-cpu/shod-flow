"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireDepartment } from "@/lib/auth-guard";
import { toUserMessage, requireField, ValidationError } from "@/lib/errors";

export interface ServiceInput {
  entityType: string; // "TRUCK" | "TRAILER"
  unitId: string;
  serviceDate: string;
  serviceType: string;
  shop: string;
  cost?: string | number;
  description?: string;
}

export async function getServices() {
  await requireDepartment("FLEET");
  return prisma.service.findMany({
    include: { truck: true, trailer: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createService(data: ServiceInput) {
  const user = await requireDepartment("FLEET");
  try {
    requireField(data.unitId, "Unit");
    requireField(data.serviceType, "Xizmat turi");
    requireField(data.shop, "Servis (shop)");

    let cost: number | null = null;
    if (data.cost !== undefined && data.cost !== "" && data.cost !== null) {
      cost = Number(data.cost);
      if (Number.isNaN(cost) || cost < 0) throw new ValidationError("Narx noto'g'ri.");
    }

    const service = await prisma.service.create({
      data: {
        entityType: data.entityType,
        truckId: data.entityType === "TRUCK" ? data.unitId : null,
        trailerId: data.entityType === "TRAILER" ? data.unitId : null,
        serviceDate: new Date(data.serviceDate),
        serviceType: data.serviceType.trim(),
        shop: data.shop.trim(),
        cost,
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
