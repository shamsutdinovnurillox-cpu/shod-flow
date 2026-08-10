import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Department } from "@prisma/client";
import { canAccess } from "@/lib/modules";

// ============================================================================
// Server-side authorization guards.
//
// PRD: "Unauthorized department routes must be blocked on both frontend and
// backend." Proxy (middleware) route darajasida bloklaydi; bu guard'lar esa
// har bir server action ichida qo'shimcha (defense-in-depth) tekshiradi —
// chunki server action'lar to'g'ridan-to'g'ri chaqirilishi mumkin.
// ============================================================================

export { AuthError } from "./errors";
import { AuthError } from "./errors";

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "ADMIN" | "FLEET_USER" | "SAFETY_USER";
  department: Department;
  permissions: string[];
}

/**
 * Sessiyani bazaga solishtiradi va foydalanuvchini qaytaradi (yo'q bo'lsa null).
 *
 * JWT o'zi bilan rol/bo'lim/ruxsatlarni olib yuradi, lekin ular token berilgan
 * paytdagi holat. Bazadan qayta o'qish uch narsani hal qiladi:
 *   1. O'chirilgan yoki boshqa bazaga tegishli user id — FK xatosi o'rniga
 *      tushunarli "qaytadan kiring" xabari;
 *   2. isActive=false qilingan hisob eski token bilan ishlashda davom etmaydi;
 *   3. Rol/ruxsat o'zgarishi darhol kuchga kiradi, token muddatini kutmasdan.
 */
async function activeSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const sessionUser = session?.user as SessionUser | undefined;
  if (!sessionUser?.id) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, name: true, email: true, role: true, department: true, permissions: true, isActive: true },
  });
  if (!dbUser || !dbUser.isActive) return null;

  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    department: dbUser.department,
    permissions: dbUser.permissions,
  };
}

/** Tizimga kirgan foydalanuvchini qaytaradi yoki xato tashlaydi. */
export async function requireUser(): Promise<SessionUser> {
  const user = await activeSessionUser();
  if (!user) throw new AuthError("Sessiya yaroqsiz. Chiqib, qaytadan tizimga kiring.");
  return user;
}

/** Foydalanuvchi shu bo'limga (yoki ADMIN) tegishliligini talab qiladi. */
export async function requireDepartment(dept: Department): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.department !== dept) {
    throw new AuthError("Bu bo'limga ruxsatingiz yo'q.");
  }
  return user;
}

/** Faqat ADMIN. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthError("Bu amal faqat administrator uchun.");
  return user;
}

/**
 * Modulga ruxsatni talab qiladi (write action'lar uchun — defense-in-depth).
 * Bo'lim + granular permission ikkalasini tekshiradi.
 */
export async function requirePermission(moduleKey: string): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAccess(user, moduleKey)) {
    throw new AuthError("Bu modulga ruxsatingiz yo'q.");
  }
  return user;
}

/**
 * Sahifa uchun modul ruxsatini tekshiradi — ruxsat bo'lmasa redirect.
 * (Server component boshida chaqiriladi.)
 */
export async function requireModule(moduleKey: string): Promise<void> {
  const user = await activeSessionUser();
  // Sessiya yaroqsiz bo'lsa — login'ga. ?stale=1 middleware'ga "bu tokenni
  // haqiqiy deb bilma" deb aytadi, aks holda u bizni "/" ga qaytarib yuboradi.
  if (!user) redirect("/login?stale=1");
  if (!canAccess(user, moduleKey)) redirect("/");
}
