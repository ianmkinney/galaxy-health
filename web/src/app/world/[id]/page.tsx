import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { CustomWorld } from "@/components/planets/custom-world";
import { isCorePlanet } from "@/lib/galaxy-types";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/");
  const { id } = await params;
  if (!id || isCorePlanet(id)) notFound();
  return <CustomWorld id={id} />;
}
