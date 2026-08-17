"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guard";
import { toUserMessage, requireField, ValidationError } from "@/lib/errors";
import bcrypt from "bcryptjs";

// ============================================================================
// Foydalanuvchi o'z parolini o'zgartiradi (PRD 6 — password reset/self-service).
// Joriy parolni tekshirib, keyin yangisini o'rnatadi.
// ============================================================================

export async function changeOwnPassword(data: { currentPassword: string; newPassword: string }) {
  const sessionUser = await requireUser();
  try {
    requireField(data.currentPassword, "Joriy parol");
    if (!data.newPassword || data.newPassword.length < 8) {
      throw new ValidationError("Yangi parol kamida 8 belgidan iborat bo'lishi kerak.");
    }
    if (data.currentPassword === data.newPassword) {
      throw new ValidationError("Yangi parol eskisidan farq qilishi kerak.");
    }

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!user) throw new ValidationError("Foydalanuvchi topilmadi.");

    const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!ok) throw new ValidationError("Joriy parol noto'g'ri.");

    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await prisma.auditLog.create({
      data: { userId: user.id, action: "CHANGE_PASSWORD", entityType: "User", entityId: user.id },
    });
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}
