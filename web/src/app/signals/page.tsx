import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignalsPage } from "@/components/settings-signals";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    <main className="min-h-screen bg-[#05070F]">
      <SignalsPage />
    </main>
  );
}
