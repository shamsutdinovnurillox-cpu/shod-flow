import { getTrailers } from "@/app/actions/fleet";
import { TrailersClient } from "@/components/fleet/TrailersClient";

export default async function TrailersPage() {
  const trailers = await getTrailers();
  
  return (
    <TrailersClient initialTrailers={trailers} />
  );
}
