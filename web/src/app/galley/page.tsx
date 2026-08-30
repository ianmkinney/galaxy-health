import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GalaxyProvider } from "@/components/galaxy-provider";
import { GalleyWorld } from "@/components/planets/galley-world";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    <GalaxyProvider>
      <GalleyWorld />
    </GalaxyProvider>
  );
}
