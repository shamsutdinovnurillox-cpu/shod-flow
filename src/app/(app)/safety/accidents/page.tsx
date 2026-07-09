import { getAccidents, getDrivers } from "@/app/actions/safety";
import { requireModule } from "@/lib/auth-guard";
import { getTrucks } from "@/app/actions/fleet";
import { AccidentsClient } from "@/components/safety/AccidentsClient";

export default async function AccidentsPage() {
  await requireModule("safety.accidents");
  const [accidents, drivers, trucks] = await Promise.all([
    getAccidents(),
    getDrivers(),
    getTrucks(),
  ]);

  return (
    <AccidentsClient
      initialAccidents={accidents}
      drivers={drivers}
      trucks={trucks}
    />
  );
}
