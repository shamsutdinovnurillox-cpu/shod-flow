"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { toUserMessage, requireField, ValidationError } from "@/lib/errors";
import type { ExpenseCategory } from "@prisma/client";

export interface ExpenseInput {
  entityType: string; // "TRUCK" | "TRAILER" | "FLEET"
  unitId?: string;
  date: string;
  category: string;
  vendor: string;
  amount: string | number;
  paymentMethod?: string;
  description?: string;
}

export async function getExpenses() {
  await requirePermission("fleet.expenses");
  return prisma.expense.findMany({
    include: { truck: true, trailer: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createExpense(data: ExpenseInput) {
  const user = await requirePermission("fleet.expenses");
  try {
    requireField(data.vendor, "Vendor");
    if (data.entityType !== "FLEET") requireField(data.unitId, "Unit");

    const amount = Number(data.amount);
    if (Number.isNaN(amount) || amount < 0) throw new ValidationError("Summa noto'g'ri.");

    const expense = await prisma.expense.create({
      data: {
        entityType: data.entityType,
        truckId: data.entityType === "TRUCK" ? data.unitId : null,
        trailerId: data.entityType === "TRAILER" ? data.unitId : null,
        date: new Date(data.date),
        category: data.category as ExpenseCategory,
        vendor: data.vendor.trim(),
        amount,
        paymentMethod: data.paymentMethod?.trim() || null,
        description: data.description?.trim() || null,
      },
      include: { truck: true, trailer: true },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "CREATE", entityType: "Expense", entityId: expense.id },
    });

    revalidatePath("/fleet/expenses");
    return expense;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}
