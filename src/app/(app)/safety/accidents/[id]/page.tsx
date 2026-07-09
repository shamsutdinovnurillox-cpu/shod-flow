import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth-guard";
import { getAccidentById, getEntityAuditLogs, getEntityDocuments } from "@/app/actions/safety";
import { getTrucks } from "@/app/actions/fleet";
import { AccidentDetailClient } from "@/components/safety/AccidentDetailClient";

export default async function AccidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("safety.accidents");
  const { id } = await params;
  const accident = await getAccidentById(id);
  if (!accident) notFound();

  const [documents, logs, trucks] = await Promise.all([
    getEntityDocuments("ACCIDENT", id),
    getEntityAuditLogs("Accident", id),
    getTrucks(),
  ]);

  return <AccidentDetailClient accident={accident} trucks={trucks} documents={documents} logs={logs} />;
}
