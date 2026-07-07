import { getServices } from "@/app/actions/services";
import { getTrucks, getTrailers } from "@/app/actions/fleet";
import { ServicesClient } from "@/components/fleet/ServicesClient";

export default async function ServicesPage() {
  const [services, trucks, trailers] = await Promise.all([
    getServices(),
    getTrucks(),
    getTrailers(),
  ]);
  
  return (
    <ServicesClient initialServices={services} trucks={trucks} trailers={trailers} />
  );
}
