import { notFound } from "next/navigation";
import { getTrailerById } from "@/app/actions/fleet";
import { getDrivers } from "@/app/actions/safety";
import { TrailerProfileClient } from "@/components/fleet/TrailerProfileClient";

export default async function TrailerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [trailer, drivers] = await Promise.all([getTrailerById(id), getDrivers()]);
  if (!trailer) notFound();

  return <TrailerProfileClient trailer={trailer} drivers={drivers} />;
}
