import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GalaxyProvider } from "@/components/galaxy-provider";
import { SignalsPage } from "@/components/settings-signals";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    <main className="min-h-screen bg-[#05070F]">
      <GalaxyProvider>
        <SignalsPage />
      </GalaxyProvider>
    </main>
  );
}
