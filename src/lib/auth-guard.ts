import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
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

export class AuthError extends Error {
  constructor(message = "Ruxsat yo'q.") {
    super(message);
    this.name = "AuthError";
  }
}

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "ADMIN" | "FLEET_USER" | "SAFETY_USER";
  department: Department;
  permissions: string[];
}

/** Tizimga kirgan foydalanuvchini qaytaradi yoki xato tashlaydi. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new AuthError("Tizimga kiring.");
  return session.user as SessionUser;
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
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccess(session.user, moduleKey)) redirect("/");
}
