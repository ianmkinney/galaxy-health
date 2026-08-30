"use client";

import { signIn, signOut } from "next-auth/react";
import { motion } from "motion/react";
import { ShimmerButton } from "@/components/ui/shimmer-button";

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
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(76,224,255,0.18),transparent_50%),radial-gradient(ellipse_at_bottom,rgba(169,139,255,0.16),transparent_45%),#05070F]" />
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
          One Google login.
          <span className="block bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-transparent">
            Your whole system.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/60">
          Sign in with Google. Health logs live in your private Drive app data
          folder — no Galaxy Health server account, no separate password.
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
