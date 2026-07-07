import { notFound } from "next/navigation";
import { getDriverById, getEntityDocuments } from "@/app/actions/safety";
import { DriverProfileView } from "@/components/safety/DriverProfileView";

export default async function DriverProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const driver = await getDriverById(id);
  if (!driver) notFound();
  const documents = await getEntityDocuments("DRIVER", id);

  return <DriverProfileView driver={driver} documents={documents} />;
}
