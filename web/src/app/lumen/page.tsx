import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LumenWorld } from "@/components/planets/lumen-world";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return <LumenWorld />;
}
