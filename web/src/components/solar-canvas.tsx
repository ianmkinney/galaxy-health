"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { PLANET_META, type PlanetId } from "@/lib/galaxy-types";

type Props = {
  planets: { id: PlanetId; name: string; enabled: boolean }[];
  inFlightCount: number;
};

const ORBITS: Record<PlanetId, { r: number; duration: number; phase: number }> = {
  galley: { r: 58, duration: 18, phase: 0 },
  atlas: { r: 88, duration: 28, phase: 1.2 },
  lumen: { r: 118, duration: 40, phase: 2.4 },
  observatory: { r: 148, duration: 55, phase: 0.6 },
};

/** Decorative orbiting system for the web Bridge (CSS/Motion, not RN SVG). */
export function SolarCanvas({ planets, inFlightCount }: Props) {
  const enabled = planets.filter((p) => p.enabled);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(76,224,255,0.14),transparent_55%),radial-gradient(circle_at_30%_20%,rgba(169,139,255,0.18),transparent_40%)]" />
      <div className="absolute inset-[18%] rounded-full border border-white/5" />
      <div className="absolute inset-[28%] rounded-full border border-white/5" />
      <div className="absolute inset-[38%] rounded-full border border-white/5" />
      <div className="absolute inset-[48%] rounded-full border border-white/5" />

      <motion.div
        className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFE6A3] shadow-[0_0_40px_#FFE6A3]"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {enabled.map((planet) => {
        const orbit = ORBITS[planet.id];
        const accent = PLANET_META[planet.id].accent;
        return (
          <motion.div
            key={planet.id}
            className="absolute left-1/2 top-1/2"
            style={{ width: orbit.r * 2, height: orbit.r * 2, marginLeft: -orbit.r, marginTop: -orbit.r }}
            animate={{ rotate: 360 }}
            transition={{
              duration: orbit.duration,
              repeat: Infinity,
              ease: "linear",
              delay: -orbit.phase,
            }}
          >
            <Link
              href={PLANET_META[planet.id].route}
              className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
              title={`Warp to ${planet.name}`}
            >
              <motion.span
                className="block h-5 w-5 rounded-full border border-white/30 shadow-lg"
                style={{ backgroundColor: accent, boxShadow: `0 0 18px ${accent}` }}
                whileHover={{ scale: 1.35 }}
                animate={{
                  boxShadow: [
                    `0 0 10px ${accent}`,
                    `0 0 22px ${accent}`,
                    `0 0 10px ${accent}`,
                  ],
                }}
                transition={{ duration: 2.2, repeat: Infinity }}
              />
            </Link>
          </motion.div>
        );
      })}

      {inFlightCount > 0 ? (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-cyan-300/30 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-100/80 backdrop-blur">
          {inFlightCount} in transit
        </div>
      ) : null}
    </div>
  );
}
