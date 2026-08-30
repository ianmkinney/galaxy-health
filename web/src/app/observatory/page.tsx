import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GalaxyProvider } from "@/components/galaxy-provider";
import { ObservatoryWorld } from "@/components/planets/observatory-world";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    <GalaxyProvider>
      <ObservatoryWorld />
    </GalaxyProvider>
  );
}
