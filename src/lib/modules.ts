// ============================================================================
// Modul reyestri + kirish nazorati (granular permissions).
// Bu fayl HAM client (Sidebar), HAM server (guards) tomonda ishlatiladi —
// shuning uchun server-only import yo'q.
//
// Semantika:
//   - ADMIN → hamma modul.
//   - Foydalanuvchi permissions BO'SH → o'z bo'limi ichidagi barcha modullar
//     (default: eski userlar buzilmaydi).
//   - permissions to'ldirilgan → faqat berilgan kalitlar (o'z bo'limida).
// Dashboard'lar cheklanmaydi (reyestrda yo'q) — har bir bo'lim useri ko'radi.
// ============================================================================

export type Dept = "FLEET" | "SAFETY";

export interface ModuleDef {
  key: string;
  label: string;
  dept: Dept;
  href: string;
}

export const MODULES: ModuleDef[] = [
  { key: "fleet.trucks", label: "Trucks", dept: "FLEET", href: "/fleet/trucks" },
  { key: "fleet.trailers", label: "Trailers", dept: "FLEET", href: "/fleet/trailers" },
  { key: "fleet.devices", label: "Devices", dept: "FLEET", href: "/fleet/devices" },
  { key: "fleet.services", label: "Services", dept: "FLEET", href: "/fleet/services" },
  { key: "fleet.expenses", label: "Expenses", dept: "FLEET", href: "/fleet/expenses" },
  { key: "fleet.documents", label: "Documents", dept: "FLEET", href: "/fleet/documents" },
  { key: "fleet.notifications", label: "Notifications", dept: "FLEET", href: "/fleet/notifications" },
  { key: "safety.drivers", label: "Drivers", dept: "SAFETY", href: "/safety/drivers" },
  { key: "safety.insurance", label: "Insurance", dept: "SAFETY", href: "/safety/insurance" },
  { key: "safety.accidents", label: "Accidents", dept: "SAFETY", href: "/safety/accidents" },
  { key: "safety.claims", label: "Cargo Claims", dept: "SAFETY", href: "/safety/cargo-claims" },
  { key: "safety.inspections", label: "Inspections", dept: "SAFETY", href: "/safety/inspections" },
  { key: "safety.documents", label: "Safety Documents", dept: "SAFETY", href: "/safety/documents" },
  { key: "safety.notifications", label: "Notifications", dept: "SAFETY", href: "/safety/notifications" },
];

export const FLEET_MODULES = MODULES.filter((m) => m.dept === "FLEET");
export const SAFETY_MODULES = MODULES.filter((m) => m.dept === "SAFETY");

interface PermUser {
  role?: string | null;
  department?: string | null;
  permissions?: string[] | null;
}

/** Foydalanuvchi berilgan modul kalitiga kira oladimi. */
export function canAccess(user: PermUser, key: string): boolean {
  if (user.role === "ADMIN") return true;
  const mod = MODULES.find((m) => m.key === key);
  if (!mod) return true; // cheklanmaydigan sahifa (masalan dashboard)
  if (user.department !== mod.dept) return false; // boshqa bo'lim
  const perms = user.permissions ?? [];
  if (perms.length === 0) return true; // bo'sh = bo'lim ichida to'liq kirish
  return perms.includes(key);
}

/** URL yo'lidan modul kalitini topadi (page guard uchun). */
export function moduleKeyForPath(pathname: string): string | null {
  const mod = MODULES.find((m) => pathname === m.href || pathname.startsWith(m.href + "/"));
  return mod?.key ?? null;
}
