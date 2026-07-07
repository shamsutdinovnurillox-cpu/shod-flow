import { getTrucks } from "@/app/actions/fleet";
import { requireModule } from "@/lib/auth-guard";
import { TrucksClient } from "@/components/fleet/TrucksClient";

export default async function TrucksPage() {
  await requireModule("fleet.trucks");
  const trucks = await getTrucks();
  
  return (
    <TrucksClient initialTrucks={trucks} />
  );
}
