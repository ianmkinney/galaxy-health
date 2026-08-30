import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BridgeConsole } from "@/components/bridge-console";

export default async function BridgePage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <main className="min-h-screen bg-[#05070F]">
      <BridgeConsole userName={session.user.name} />
    </main>
  );
}
