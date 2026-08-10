import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth-guard";
import { getTruckById } from "@/app/actions/fleet";
import { getDeviceAssignmentsByTruck } from "@/app/actions/devices";
import { getDrivers } from "@/app/actions/safety";
import { TruckProfileClient } from "@/components/fleet/TruckProfileClient";

export default async function TruckProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModule("fleet.trucks");
  const { id } = await params;
  const [truck, drivers, deviceHistory] = await Promise.all([
    getTruckById(id),
    getDrivers(),
    getDeviceAssignmentsByTruck(id),
  ]);
  if (!truck) notFound();

  return <TruckProfileClient truck={truck} drivers={drivers} deviceHistory={deviceHistory} />;
}
