import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GalleyWorld } from "@/components/planets/galley-world";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return <GalleyWorld />;
}
