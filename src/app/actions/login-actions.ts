"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// ============================================================================
// Login oldi tekshiruvi — SESSIYA YARATMAYDI.
// Faqat login sahifasiga "2FA kodi kerakmi?" ni bildiradi.
// mfaRequired faqat parol TO'G'RI bo'lganda qaytadi (holat sizib chiqmaydi).
// ============================================================================

export async function preAuth(
  email: string,
  password: string,
): Promise<{ ok: boolean; mfaRequired: boolean }> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user || !user.isActive) return { ok: false, mfaRequired: false };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { ok: false, mfaRequired: false };

  return { ok: true, mfaRequired: user.mfaEnabled };
}
