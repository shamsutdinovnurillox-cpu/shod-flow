import { requireModule } from "@/lib/auth-guard";
import { getDevices } from "@/app/actions/devices";
import { getTrucks } from "@/app/actions/fleet";
import { DevicesClient } from "@/components/fleet/DevicesClient";

export default async function DevicesPage() {
  await requireModule("fleet.devices");
  const [devices, trucks] = await Promise.all([getDevices(), getTrucks()]);

  return <DevicesClient initialDevices={devices} trucks={trucks} />;
}
