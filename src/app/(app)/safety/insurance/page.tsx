import { getInsurances, getDrivers, getEntityDocuments } from "@/app/actions/safety";
import { requireModule } from "@/lib/auth-guard";
import { getTrucks } from "@/app/actions/fleet";
import { InsuranceClient } from "@/components/safety/InsuranceClient";

export default async function InsurancePage() {
  await requireModule("safety.insurance");
  const [insurances, drivers, trucks, coiDocs] = await Promise.all([
    getInsurances(),
    getDrivers(),
    getTrucks(),
    getEntityDocuments("INSURANCE"),
  ]);

  return (
    <InsuranceClient initialInsurance={insurances} drivers={drivers} trucks={trucks} initialCoiDocs={coiDocs} />
  );
}
