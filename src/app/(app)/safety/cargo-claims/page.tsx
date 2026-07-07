import { getCargoClaims, getDrivers } from "@/app/actions/safety";
import { getTrucks } from "@/app/actions/fleet";
import { CargoClaimsClient } from "@/components/safety/CargoClaimsClient";

export default async function CargoClaimsPage() {
  const claims = await getCargoClaims();
  const drivers = await getDrivers();
  const trucks = await getTrucks();
  
  return (
    <CargoClaimsClient initialClaims={claims} drivers={drivers} trucks={trucks} />
  );
}
