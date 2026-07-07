import { getInsurances, getDrivers } from "@/app/actions/safety";
import { requireModule } from "@/lib/auth-guard";
import { getTrucks } from "@/app/actions/fleet";
import { InsuranceClient } from "@/components/safety/InsuranceClient";

export default async function InsurancePage() {
  await requireModule("safety.insurance");
  const insurances = await getInsurances();
  const drivers = await getDrivers();
  const trucks = await getTrucks();
  
  return (
    <InsuranceClient initialInsurance={insurances} drivers={drivers} trucks={trucks} />
  );
}
