import { getDrivers } from "@/app/actions/safety";
import { requireModule } from "@/lib/auth-guard";
import { DriversClient } from "@/components/safety/DriversClient";

export default async function DriversPage() {
  await requireModule("safety.drivers");
  const drivers = await getDrivers();
  
  return (
    <DriversClient initialDrivers={drivers} />
  );
}
