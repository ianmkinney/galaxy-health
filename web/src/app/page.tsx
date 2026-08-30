import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LandingHero } from "@/components/auth-buttons";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/bridge");
  return <LandingHero />;
}
