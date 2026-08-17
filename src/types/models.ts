import type { Prisma, Truck, Trailer, Driver, Document, AuditLog, User } from "@prisma/client";

// Client komponentlar uchun umumiy tip ta'riflari (Prisma'dan olingan).
export type { Truck, Trailer, Driver, Document };

// Foydalanuvchi (parol hash'isiz — client'ga xavfsiz).
export type UserRow = Pick<User, "id" | "email" | "name" | "role" | "department" | "isActive" | "permissions" | "createdAt">;

export type DeviceWithTruck = Prisma.DeviceGetPayload<{
  include: { truck: true; assignments: true };
}>;

/** Qurilma profili — to'liq biriktiruv tarixi bilan. */
export type DeviceProfile = Prisma.DeviceGetPayload<{
  include: { truck: true; assignments: { include: { truck: true } } };
}>;

/** Truck profilidagi qurilma tarixi qatori. */
export type DeviceAssignmentRow = Prisma.DeviceAssignmentGetPayload<{
  include: { device: true; truck: true };
}>;

/** Trucks ro'yxati qatori — joriy biriktiruv (haydovchi bilan) va qurilmalar. */
export type TruckRow = Prisma.TruckGetPayload<{
  include: {
    assignments: { include: { driver: true } };
    devices: true;
  };
}>;
export type ServiceWithUnit = Prisma.ServiceGetPayload<{ include: { truck: true; trailer: true } }>;
export type ExpenseWithUnit = Prisma.ExpenseGetPayload<{ include: { truck: true; trailer: true } }>;
export type InsuranceWithRefs = Prisma.InsuranceGetPayload<{ include: { driver: true; truck: true } }>;
export type AccidentWithRefs = Prisma.AccidentGetPayload<{ include: { driver: true; truck: true } }>;
export type CargoClaimWithRefs = Prisma.CargoClaimGetPayload<{ include: { driver: true; truck: true } }>;
export type InspectionWithRefs = Prisma.InspectionGetPayload<{ include: { driver: true; truck: true } }>;
export type AuditLogWithUser = Prisma.AuditLogGetPayload<{ include: { user: true } }>;
export type AssignmentWithRefs = Prisma.AssignmentGetPayload<{ include: { driver: true; truck: true } }>;
export type { AuditLog };

export type TruckProfile = Prisma.TruckGetPayload<{
  include: {
    assignments: { include: { driver: true } };
    services: true;
    expenses: true;
    devices: { include: { truck: true; assignments: true } };
  };
}>;

export type TrailerProfile = Prisma.TrailerGetPayload<{
  include: {
    assignments: { include: { driver: true } };
    services: true;
    expenses: true;
  };
}>;

export type DriverProfile = Prisma.DriverGetPayload<{
  include: {
    accidents: { include: { truck: true } };
    cargoClaims: { include: { truck: true } };
    inspections: { include: { truck: true } };
    insurances: { include: { truck: true } };
    assignments: { include: { truck: true; trailer: true } };
  };
}>;
