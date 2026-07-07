import { getCargoClaims, getDrivers } from "@/app/actions/safety";
import { requireModule } from "@/lib/auth-guard";
import { getTrucks } from "@/app/actions/fleet";
import { CargoClaimsClient } from "@/components/safety/CargoClaimsClient";

export default async function CargoClaimsPage() {
  await requireModule("safety.claims");
  const claims = await getCargoClaims();
  const drivers = await getDrivers();
  const trucks = await getTrucks();
  
  return (
    <CargoClaimsClient initialClaims={claims} drivers={drivers} trucks={trucks} />
  );
}
