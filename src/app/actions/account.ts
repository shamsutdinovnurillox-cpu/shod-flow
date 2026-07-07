"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-guard";
import { toUserMessage, requireField, ValidationError } from "@/lib/errors";
import { generateSecret, verifyToken, keyUri, qrDataUrl } from "@/lib/mfa";
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

// ============================================================================
// Ikki faktorli autentifikatsiya (TOTP) — o'z-o'ziga xizmat.
// ============================================================================

/** 2FA sozlashni boshlaydi: maxfiy kalit yaratadi (hali yoqilmaydi) + QR qaytaradi. */
export async function startMfaSetup(): Promise<{ qr: string; secret: string }> {
  const sessionUser = await requireUser();
  try {
    const secret = generateSecret();
    // Maxfiy kalitni saqlaymiz, lekin mfaEnabled=false — tasdiqlanmaguncha majburlanmaydi.
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: { mfaSecret: secret, mfaEnabled: false },
    });
    const uri = keyUri(sessionUser.email ?? "user", secret);
    const qr = await qrDataUrl(uri);
    return { qr, secret };
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** Kodni tasdiqlab, 2FA'ni yoqadi. */
export async function confirmMfaSetup(token: string): Promise<void> {
  const sessionUser = await requireUser();
  try {
    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!user?.mfaSecret) throw new ValidationError("Avval sozlashni boshlang.");
    if (!verifyToken(token, user.mfaSecret)) {
      throw new ValidationError("Kod noto'g'ri. Authenticator ilovasidagi kodni kiriting.");
    }
    await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true } });
    await prisma.auditLog.create({
      data: { userId: user.id, action: "ENABLE_MFA", entityType: "User", entityId: user.id },
    });
    revalidatePath("/account");
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** 2FA'ni o'chiradi (parol bilan tasdiqlab). */
export async function disableMfa(password: string): Promise<void> {
  const sessionUser = await requireUser();
  try {
    requireField(password, "Parol");
    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!user) throw new ValidationError("Foydalanuvchi topilmadi.");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new ValidationError("Parol noto'g'ri.");
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: false, mfaSecret: null },
    });
    await prisma.auditLog.create({
      data: { userId: user.id, action: "DISABLE_MFA", entityType: "User", entityId: user.id },
    });
    revalidatePath("/account");
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}
