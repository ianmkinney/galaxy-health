import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GalaxyProvider } from "@/components/galaxy-provider";
import { AtlasWorld } from "@/components/planets/atlas-world";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    <GalaxyProvider>
      <AtlasWorld />
    </GalaxyProvider>
  );
}
