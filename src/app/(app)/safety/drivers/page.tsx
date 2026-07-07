import { getDrivers } from "@/app/actions/safety";
import { DriversClient } from "@/components/safety/DriversClient";

export default async function DriversPage() {
  const drivers = await getDrivers();
  
  return (
    <DriversClient initialDrivers={drivers} />
  );
}
