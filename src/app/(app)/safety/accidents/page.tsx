import { getAccidents, getDrivers } from "@/app/actions/safety";
import { getTrucks, getTrailers } from "@/app/actions/fleet";
import { AccidentsClient } from "@/components/safety/AccidentsClient";

export default async function AccidentsPage() {
  const [accidents, drivers, trucks, trailers] = await Promise.all([
    getAccidents(),
    getDrivers(),
    getTrucks(),
    getTrailers(),
  ]);
  
  return (
    <AccidentsClient 
      initialAccidents={accidents} 
      drivers={drivers} 
      trucks={trucks} 
      trailers={trailers} 
    />
  );
}
