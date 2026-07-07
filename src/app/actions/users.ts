"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";
import { toUserMessage, requireField, ValidationError } from "@/lib/errors";
import bcrypt from "bcryptjs";
import { MODULES } from "@/lib/modules";
import type { Role, Department } from "@prisma/client";

// ============================================================================
// Foydalanuvchi boshqaruvi (PRD 2, 6) — faqat ADMIN.
// Admin foydalanuvchilarni yaratadi, faolsizlantiradi, rol/bo'lim tayinlaydi,
// parolni reset qiladi. Har bir amal audit log'ga yoziladi.
// Muhim: admin o'z hisobini bloklab qo'ymasligi uchun himoya (self-lockout).
// ============================================================================

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  department: true,
  isActive: true,
  permissions: true,
  mfaEnabled: true,
  createdAt: true,
} as const;

function validatePassword(pw: string) {
  if (!pw || pw.length < 8) {
    throw new ValidationError("Parol kamida 8 belgidan iborat bo'lishi kerak.");
  }
}

export async function getUsers() {
  await requireAdmin();
  return prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    select: USER_SELECT,
  });
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: string;
  department: string;
}) {
  const admin = await requireAdmin();
  try {
    requireField(data.name, "Ism");
    requireField(data.email, "Email");
    validatePassword(data.password);

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        passwordHash,
        role: data.role as Role,
        department: data.department as Department,
      },
      select: USER_SELECT,
    });

    await prisma.auditLog.create({
      data: { userId: admin.id, action: "CREATE", entityType: "User", entityId: user.id },
    });
    revalidatePath("/admin/users");
    return user;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

export async function setUserActive(userId: string, isActive: boolean) {
  const admin = await requireAdmin();
  try {
    if (userId === admin.id) {
      throw new ValidationError("O'z hisobingizni faolsizlantirib bo'lmaydi.");
    }
    await prisma.user.update({ where: { id: userId }, data: { isActive } });
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: isActive ? "ACTIVATE" : "DEACTIVATE",
        entityType: "User",
        entityId: userId,
      },
    });
    revalidatePath("/admin/users");
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

export async function updateUserRole(userId: string, role: string, department: string) {
  const admin = await requireAdmin();
  try {
    if (userId === admin.id && role !== "ADMIN") {
      throw new ValidationError("O'zingizni administrator rolidan chiqarib bo'lmaydi.");
    }
    await prisma.user.update({
      where: { id: userId },
      data: { role: role as Role, department: department as Department },
    });
    await prisma.auditLog.create({
      data: { userId: admin.id, action: "UPDATE", entityType: "User", entityId: userId },
    });
    revalidatePath("/admin/users");
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

export async function updateUserPermissions(userId: string, permissions: string[]) {
  const admin = await requireAdmin();
  try {
    // Faqat haqiqiy modul kalitlarini saqlaymiz.
    const valid = permissions.filter((p) => MODULES.some((m) => m.key === p));
    await prisma.user.update({ where: { id: userId }, data: { permissions: valid } });
    await prisma.auditLog.create({
      data: { userId: admin.id, action: "UPDATE_PERMISSIONS", entityType: "User", entityId: userId },
    });
    revalidatePath("/admin/users");
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

export async function adminDisableMfa(userId: string) {
  const admin = await requireAdmin();
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });
    await prisma.auditLog.create({
      data: { userId: admin.id, action: "DISABLE_MFA", entityType: "User", entityId: userId },
    });
    revalidatePath("/admin/users");
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

export async function adminResetPassword(userId: string, newPassword: string) {
  const admin = await requireAdmin();
  try {
    validatePassword(newPassword);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await prisma.auditLog.create({
      data: { userId: admin.id, action: "RESET_PASSWORD", entityType: "User", entityId: userId },
    });
    revalidatePath("/admin/users");
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}
