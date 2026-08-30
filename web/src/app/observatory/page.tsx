import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GalaxyProvider } from "@/components/galaxy-provider";
import { ObservatoryPage } from "@/components/planet-pages";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    <main className="min-h-screen bg-[#05070F]">
      <GalaxyProvider>
        <ObservatoryPage />
      </GalaxyProvider>
    </main>
  );
}
