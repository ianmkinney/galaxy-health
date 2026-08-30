"use client";

import { useMemo } from "react";
import { signIn, signOut } from "next-auth/react";
import { motion } from "motion/react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { PlanetCanvas } from "@/components/three/planet-canvas";
import { emptyStore } from "@/lib/galaxy-types";
import { seedHealthyTestData } from "@/lib/test-data";

export function GoogleSignInButton() {
  return (
    <ShimmerButton
      tone="#4CE0FF"
      onClick={() => signIn("google", { callbackUrl: "/bridge" })}
      className="min-w-[220px]"
    >
      Continue with Google
    </ShimmerButton>
  );
}

export function SignOutButton() {
  return (
    <ShimmerButton
      variant="ghost"
      tone="#4CE0FF"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Sign out
    </ShimmerButton>
  );
}

export function LandingHero() {
  const preview = useMemo(() => seedHealthyTestData(emptyStore()), []);
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <PlanetCanvas planet="bridge" store={preview} className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(5,7,15,0.55)_70%,#05070F_100%)]" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="relative z-10 max-w-xl text-center"
      >
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-300/80">
          Galaxy Health Web
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl font-black tracking-tight text-white sm:text-6xl">
          Populate a universe
          <span className="block bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-transparent">
            that keeps you well.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/60">
          Four worlds orbit a living neural core — you. Logs, files, and systems you set up raise
          cities. Sign in with Google; data lives in your private Drive app folder.
        </p>
        <div className="mt-8 flex justify-center">
          <GoogleSignInButton />
        </div>
        <p className="mt-6 text-xs text-white/35">
          Uses Google OAuth + Drive <code className="text-white/50">appDataFolder</code>.
          Mobile stays on-device.
        </p>
      </motion.div>
    </div>
  );
}
