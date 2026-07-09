import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth-guard";
import { getInspectionById, getEntityAuditLogs, getEntityDocuments } from "@/app/actions/safety";
import { getTrucks } from "@/app/actions/fleet";
import { InspectionDetailClient } from "@/components/safety/InspectionDetailClient";

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("safety.inspections");
  const { id } = await params;
  const inspection = await getInspectionById(id);
  if (!inspection) notFound();

  const [documents, logs, trucks] = await Promise.all([
    getEntityDocuments("INSPECTION", id),
    getEntityAuditLogs("Inspection", id),
    getTrucks(),
  ]);

  return <InspectionDetailClient inspection={inspection} trucks={trucks} documents={documents} logs={logs} />;
}
