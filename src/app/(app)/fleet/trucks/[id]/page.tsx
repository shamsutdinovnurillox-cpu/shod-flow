import { notFound } from "next/navigation";
import { getTruckById } from "@/app/actions/fleet";
import { getDrivers } from "@/app/actions/safety";
import { TruckProfileClient } from "@/components/fleet/TruckProfileClient";

export default async function TruckProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [truck, drivers] = await Promise.all([getTruckById(id), getDrivers()]);
  if (!truck) notFound();

  return <TruckProfileClient truck={truck} drivers={drivers} />;
}
