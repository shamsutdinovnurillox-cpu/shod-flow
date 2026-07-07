import "server-only";
import { auth } from "@/auth";
import type { Department } from "@prisma/client";

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
