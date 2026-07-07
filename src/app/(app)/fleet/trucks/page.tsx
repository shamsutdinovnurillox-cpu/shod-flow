import { getTrucks } from "@/app/actions/fleet";
import { TrucksClient } from "@/components/fleet/TrucksClient";

export default async function TrucksPage() {
  const trucks = await getTrucks();
  
  return (
    <TrucksClient initialTrucks={trucks} />
  );
}
