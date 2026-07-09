import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth-guard";
import { getCargoClaimById, getEntityAuditLogs, getEntityDocuments } from "@/app/actions/safety";
import { getTrucks } from "@/app/actions/fleet";
import { CargoClaimDetailClient } from "@/components/safety/CargoClaimDetailClient";

export default async function CargoClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("safety.claims");
  const { id } = await params;
  const claim = await getCargoClaimById(id);
  if (!claim) notFound();

  const [documents, logs, trucks] = await Promise.all([
    getEntityDocuments("CLAIM", id),
    getEntityAuditLogs("CargoClaim", id),
    getTrucks(),
  ]);

  return <CargoClaimDetailClient claim={claim} trucks={trucks} documents={documents} logs={logs} />;
}
