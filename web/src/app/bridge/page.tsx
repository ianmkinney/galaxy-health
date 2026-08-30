import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GalaxyProvider } from "@/components/galaxy-provider";
import { BridgeConsole } from "@/components/bridge-console";

export default async function BridgePage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <main className="min-h-screen bg-[#05070F]">
      <GalaxyProvider>
        <BridgeConsole userName={session.user.name} />
      </GalaxyProvider>
    </main>
  );
}
