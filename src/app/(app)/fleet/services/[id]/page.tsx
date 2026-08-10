import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth-guard";
import { getServiceById, getServiceAudit } from "@/app/actions/services";
import { getTrucks, getTrailers } from "@/app/actions/fleet";
import { ServiceDetailClient } from "@/components/fleet/ServiceDetailClient";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModule("fleet.services");
  const { id } = await params;
  // Tahrirlash formasi ro'yxatdagi bilan bir xil — unda unit tanlash ham bor,
  // shuning uchun birliklar ro'yxati kerak.
  const [service, audit, trucks, trailers] = await Promise.all([
    getServiceById(id),
    getServiceAudit(id),
    getTrucks(),
    getTrailers(),
  ]);
  if (!service) notFound();

  return <ServiceDetailClient service={service} audit={audit} trucks={trucks} trailers={trailers} />;
}
