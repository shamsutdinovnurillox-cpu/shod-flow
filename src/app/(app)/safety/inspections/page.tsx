import { getInspections, getDrivers } from "@/app/actions/safety";
import { requireModule } from "@/lib/auth-guard";
import { getTrucks, getTrailers } from "@/app/actions/fleet";
import { InspectionsClient } from "@/components/safety/InspectionsClient";

export default async function InspectionsPage() {
  await requireModule("safety.inspections");
  const [inspections, drivers, trucks, trailers] = await Promise.all([
    getInspections(),
    getDrivers(),
    getTrucks(),
    getTrailers(),
  ]);
  
  return (
    <InspectionsClient 
      initialInspections={inspections} 
      drivers={drivers} 
      trucks={trucks} 
      trailers={trailers} 
    />
  );
}
