import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth-guard";
import { getDeviceById } from "@/app/actions/devices";
import { getTrucks } from "@/app/actions/fleet";
import { DeviceProfileClient } from "@/components/fleet/DeviceProfileClient";

export default async function DeviceProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModule("fleet.devices");
  const { id } = await params;
  const [device, trucks] = await Promise.all([getDeviceById(id), getTrucks()]);
  if (!device) notFound();

  return <DeviceProfileClient device={device} trucks={trucks} />;
}
