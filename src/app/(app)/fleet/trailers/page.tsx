import { getTrailers } from "@/app/actions/fleet";
import { requireModule } from "@/lib/auth-guard";
import { TrailersClient } from "@/components/fleet/TrailersClient";

export default async function TrailersPage() {
  await requireModule("fleet.trailers");
  const trailers = await getTrailers();
  
  return (
    <TrailersClient initialTrailers={trailers} />
  );
}
