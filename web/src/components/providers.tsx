"use client";

import { SessionProvider } from "next-auth/react";
import { GalaxyProvider } from "@/components/galaxy-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GalaxyProvider>{children}</GalaxyProvider>
    </SessionProvider>
  );
}
