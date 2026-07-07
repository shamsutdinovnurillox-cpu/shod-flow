import { getInsurances, getDrivers } from "@/app/actions/safety";
import { getTrucks } from "@/app/actions/fleet";
import { InsuranceClient } from "@/components/safety/InsuranceClient";

export default async function InsurancePage() {
  const insurances = await getInsurances();
  const drivers = await getDrivers();
  const trucks = await getTrucks();
  
  return (
    <InsuranceClient initialInsurance={insurances} drivers={drivers} trucks={trucks} />
  );
}
