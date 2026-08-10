import { getTruckRows, getTruckAssignmentHistory } from "@/app/actions/fleet";
import { requireModule } from "@/lib/auth-guard";
import { TrucksClient } from "@/components/fleet/TrucksClient";

export default async function TrucksPage() {
  await requireModule("fleet.trucks");
  const [trucks, history] = await Promise.all([getTruckRows(), getTruckAssignmentHistory()]);

  return (
    <TrucksClient initialTrucks={trucks} history={history} />
  );
}
