"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission, requireAdmin } from "@/lib/auth-guard";
import { toUserMessage, requireField, ValidationError } from "@/lib/errors";
import { changedFields, writeAudit } from "@/lib/audit";
import type { ExpenseCategory, PaymentStatus } from "@prisma/client";

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

export interface ExpenseUpdateInput {
  date?: string;
  category?: string;
  vendor?: string;
  amount?: string | number;
  paymentMethod?: string;
  description?: string;
}

export async function updateExpense(id: string, data: ExpenseUpdateInput) {
  const user = await requirePermission("fleet.expenses");
  try {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Xarajat topilmadi.");

    let amount: number | undefined;
    if (data.amount !== undefined && data.amount !== "") {
      amount = Number(data.amount);
      if (Number.isNaN(amount) || amount < 0) throw new ValidationError("Summa noto'g'ri.");
    }

    const patch = {
      date: data.date ? new Date(data.date) : undefined,
      category: data.category ? (data.category as ExpenseCategory) : undefined,
      vendor: data.vendor?.trim() || undefined,
      amount,
      paymentMethod: data.paymentMethod === undefined ? undefined : data.paymentMethod.trim() || null,
      description: data.description === undefined ? undefined : data.description.trim() || null,
    };

    const details = changedFields(existing, patch);
    const expense = await prisma.expense.update({
      where: { id },
      data: patch,
      include: { truck: true, trailer: true },
    });
    await writeAudit(prisma, { userId: user.id, action: "UPDATE", entityType: "Expense", entityId: id, details });

    revalidatePath("/fleet/expenses");
    return expense;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** To'lov statusini o'zgartiradi (PENDING ↔ PAID), ixtiyoriy to'lov usuli bilan. */
export async function setExpensePaymentStatus(id: string, status: PaymentStatus, paymentMethod?: string) {
  const user = await requirePermission("fleet.expenses");
  try {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Xarajat topilmadi.");

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        paymentStatus: status,
        paymentMethod: paymentMethod?.trim() || existing.paymentMethod,
      },
      include: { truck: true, trailer: true },
    });
    await writeAudit(prisma, {
      userId: user.id, action: "STATUS_CHANGE", entityType: "Expense", entityId: id,
      details: { paymentStatus: { from: existing.paymentStatus, to: status } },
    });

    revalidatePath("/fleet/expenses");
    return expense;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** Admin-only: xarajatni o'chirish. */
export async function deleteExpense(id: string) {
  const user = await requireAdmin();
  try {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Xarajat topilmadi.");
    await prisma.expense.delete({ where: { id } });
    await writeAudit(prisma, {
      userId: user.id, action: "DELETE", entityType: "Expense", entityId: id,
      details: { vendor: existing.vendor, amount: existing.amount, category: existing.category },
    });
    revalidatePath("/fleet/expenses");
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}
