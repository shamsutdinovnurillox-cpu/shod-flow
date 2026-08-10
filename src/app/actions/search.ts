"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guard";

// Global qidiruv (PRD 3): unit/trailer raqami, VIN, plate, CDL, driver ismi,
// claim raqami, load raqami, hujjat nomi, qurilma raqamlari bo'yicha.
export interface SearchHit {
  kind: "Truck" | "Trailer" | "Driver" | "Accident" | "CargoClaim" | "Inspection" | "Document" | "Device";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export async function globalSearch(query: string): Promise<SearchHit[]> {
  await requireUser();
  const q = query.trim();
  if (q.length < 2) return [];
  const like = { contains: q, mode: "insensitive" as const };

  const [trucks, trailers, drivers, accidents, claims, inspections, documents, devices] = await Promise.all([
    prisma.truck.findMany({
      where: { OR: [{ unitNumber: like }, { vin: like }, { licensePlate: like }] },
      take: 8,
    }),
    prisma.trailer.findMany({
      where: { OR: [{ trailerNumber: like }, { vin: like }, { licensePlate: like }] },
      take: 8,
    }),
    prisma.driver.findMany({
      where: { OR: [{ firstName: like }, { lastName: like }, { cdlNumber: like }] },
      take: 8,
    }),
    prisma.accident.findMany({
      where: { OR: [{ claimNumber: like }, { adjuster: like }, { location: like }] },
      include: { driver: true },
      take: 5,
    }),
    prisma.cargoClaim.findMany({
      where: { OR: [{ claimNumber: like }, { loadNumber: like }, { adjuster: like }, { broker: like }] },
      include: { driver: true },
      take: 8,
    }),
    prisma.inspection.findMany({
      where: { OR: [{ state: like }, { violations: like }] },
      include: { driver: true },
      take: 5,
    }),
    prisma.document.findMany({
      where: { OR: [{ type: like }, { entityId: like }, { fileName: like }] },
      take: 8,
    }),
    // Qurilma nomi / raqami (PRD 4.2 devices)
    prisma.device.findMany({
      where: { OR: [{ name: like }, { vin: like }, { notes: like }] },
      include: { truck: true },
      take: 8,
    }),
  ]);

  const hits: SearchHit[] = [];
  for (const t of trucks) hits.push({ kind: "Truck", id: t.id, title: t.unitNumber, subtitle: `${t.make} · ${t.vin}`, href: `/fleet/trucks/${t.id}` });
  for (const t of trailers) hits.push({ kind: "Trailer", id: t.id, title: t.trailerNumber, subtitle: `${t.make} · ${t.vin}`, href: `/fleet/trailers/${t.id}` });
  for (const d of drivers) hits.push({ kind: "Driver", id: d.id, title: `${d.firstName} ${d.lastName}`, subtitle: `CDL ${d.cdlNumber}`, href: `/safety/drivers/${d.id}` });
  for (const a of accidents) hits.push({ kind: "Accident", id: a.id, title: `Accident ${a.claimNumber ?? new Date(a.date).toLocaleDateString()}`, subtitle: `${a.driver.firstName} ${a.driver.lastName} · ${a.status}`, href: `/safety/accidents/${a.id}` });
  for (const c of claims) hits.push({ kind: "CargoClaim", id: c.id, title: c.claimNumber || c.loadNumber, subtitle: `${c.driver.firstName} ${c.driver.lastName} · ${c.status}`, href: `/safety/cargo-claims/${c.id}` });
  for (const i of inspections) hits.push({ kind: "Inspection", id: i.id, title: `Inspection ${i.state}`, subtitle: `${i.driver.firstName} ${i.driver.lastName} · Level ${i.level}`, href: `/safety/inspections/${i.id}` });
  for (const d of documents) hits.push({ kind: "Document", id: d.id, title: d.fileName ?? d.type, subtitle: `${d.type} · ${d.entityType}`, href: d.fileUrl });
  for (const d of devices) hits.push({ kind: "Device", id: d.id, title: d.name, subtitle: d.truck ? `${d.truck.unitNumber} · ${d.condition}` : `In stock · ${d.condition}`, href: d.truck ? `/fleet/trucks/${d.truck.id}` : "/fleet/devices" });

  return hits;
}
