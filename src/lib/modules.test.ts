import { describe, it, expect } from "vitest";
import { canAccess, moduleKeyForPath, MODULES } from "./modules";

describe("canAccess (granular permissions, PRD 2)", () => {
  it("ADMIN har qanday modulga kiradi", () => {
    const admin = { role: "ADMIN", department: "ADMIN", permissions: [] };
    for (const m of MODULES) expect(canAccess(admin, m.key)).toBe(true);
  });

  it("boshqa bo'lim moduli bloklanadi", () => {
    const fleetUser = { role: "FLEET_USER", department: "FLEET", permissions: [] };
    expect(canAccess(fleetUser, "safety.drivers")).toBe(false);
    expect(canAccess(fleetUser, "fleet.trucks")).toBe(true);
  });

  it("bo'sh permissions = bo'lim ichida to'liq kirish", () => {
    const safetyUser = { role: "SAFETY_USER", department: "SAFETY", permissions: [] };
    expect(canAccess(safetyUser, "safety.accidents")).toBe(true);
    expect(canAccess(safetyUser, "safety.inspections")).toBe(true);
  });

  it("to'ldirilgan permissions faqat berilgan kalitlarga ruxsat beradi", () => {
    const limited = { role: "SAFETY_USER", department: "SAFETY", permissions: ["safety.drivers"] };
    expect(canAccess(limited, "safety.drivers")).toBe(true);
    expect(canAccess(limited, "safety.accidents")).toBe(false);
  });

  it("reyestrda yo'q sahifa (dashboard) cheklanmaydi", () => {
    const fleetUser = { role: "FLEET_USER", department: "FLEET", permissions: ["fleet.trucks"] };
    expect(canAccess(fleetUser, "fleet.dashboard-not-registered")).toBe(true);
  });
});

describe("moduleKeyForPath", () => {
  it("aniq va ichki yo'llarni topadi", () => {
    expect(moduleKeyForPath("/fleet/trucks")).toBe("fleet.trucks");
    expect(moduleKeyForPath("/fleet/trucks/abc-123")).toBe("fleet.trucks");
    expect(moduleKeyForPath("/safety/cargo-claims/xyz")).toBe("safety.claims");
    expect(moduleKeyForPath("/fleet/notifications")).toBe("fleet.notifications");
  });

  it("noma'lum yo'l uchun null", () => {
    expect(moduleKeyForPath("/unknown")).toBeNull();
  });
});
