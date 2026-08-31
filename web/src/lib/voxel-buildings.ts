import type { BuildingKind } from "./galaxy-types";

export type Voxel = { x: number; y: number; z: number; t: number };

function add(out: Voxel[], x: number, y: number, z: number, t = 1) {
  out.push({ x, y, z, t });
}

function box(
  out: Voxel[],
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  t = 1
) {
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) {
      for (let k = 0; k < d; k++) add(out, x + i, y + j, z + k, t);
    }
  }
}

function ring(out: Voxel[], cx: number, y: number, cz: number, rx: number, rz: number, n: number, t = 1) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    add(out, Math.round(cx + Math.cos(a) * rx), y, Math.round(cz + Math.sin(a) * rz), t);
  }
}

function cylinder(out: Voxel[], cx: number, cz: number, y0: number, r: number, h: number, t = 1) {
  const r2 = r * r + 0.35;
  for (let y = 0; y < h; y++) {
    for (let x = -r; x <= r; x++) {
      for (let z = -r; z <= r; z++) {
        if (x * x + z * z <= r2) add(out, cx + x, y0 + y, cz + z, t);
      }
    }
  }
}

function chimney(out: Voxel[], x: number, z: number, y0: number, h: number) {
  box(out, x, y0, z, 2, h, 2, 0);
  add(out, x, y0 + h, z, 2);
  add(out, x + 1, y0 + h, z, 2);
  add(out, x, y0 + h + 1, z + 1, 2);
}

function stairs(out: Voxel[], x: number, y: number, z: number, steps: number, dir: 1 | -1) {
  for (let i = 0; i < steps; i++) {
    box(out, x + i * dir, y + i, z, 2, 1, 3, 1);
  }
}

function lantern(out: Voxel[], x: number, y: number, z: number) {
  add(out, x, y, z, 0);
  add(out, x, y + 1, z, 2);
  add(out, x, y + 2, z, 2);
}

function normalize(voxels: Voxel[]): Voxel[] {
  if (!voxels.length) return voxels;
  const minY = Math.min(...voxels.map((v) => v.y));
  const cx = voxels.reduce((s, v) => s + v.x, 0) / voxels.length;
  const cz = voxels.reduce((s, v) => s + v.z, 0) / voxels.length;
  const seen = new Set<string>();
  const out: Voxel[] = [];
  for (const v of voxels) {
    const x = Math.round(v.x - cx);
    const y = v.y - minY;
    const z = Math.round(v.z - cz);
    const key = `${x}|${y}|${z}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ x, y, z, t: v.t });
  }
  return out;
}

function kitchen(seed: number): Voxel[] {
  const v: Voxel[] = [];
  box(v, -6, 0, -4, 13, 2, 9, 1);
  box(v, -5, 2, -3, 5, 5, 7, 0);
  box(v, 1, 2, -3, 5, 4, 6, 0);
  box(v, -4, 7, -2, 3, 2, 5, 1);
  box(v, 2, 6, -2, 3, 2, 4, 1);
  chimney(v, -5, -1, 9, 5);
  chimney(v, 4, 0, 8, 6);
  box(v, -1, 2, 3, 3, 8, 3, 2);
  box(v, 0, 10, 4, 1, 4, 1, 2);
  box(v, -2, 0, 5, 5, 3, 4, 1);
  stairs(v, -8, 0, 0, 3, 1);
  box(v, -7, 3, -1, 2, 1, 5, 2);
  box(v, 6, 3, -1, 2, 1, 4, 2);
  for (const x of [-4, -1, 2, 5]) add(v, x, 4, -4, 2);
  for (const x of [-3, 1, 4]) add(v, x, 3, 4, 2);
  lantern(v, -6, 2, 4);
  lantern(v, 6, 2, 3);
  if (seed % 2 === 0) box(v, 5, 0, 3, 4, 3, 3, 0);
  else box(v, -8, 0, -2, 3, 4, 3, 0);
  return v;
}

function archive(seed: number): Voxel[] {
  const v: Voxel[] = [];
  box(v, -6, 0, -6, 13, 2, 13, 1);
  box(v, -5, 2, -5, 11, 2, 11, 0);
  box(v, -4, 4, -4, 9, 2, 9, 1);
  box(v, -3, 6, -3, 7, 2, 7, 0);
  box(v, -2, 8, -2, 5, 2, 5, 1);
  box(v, -1, 10, -1, 3, 2, 3, 0);
  box(v, 0, 12, 0, 1, 5, 1, 2);
  box(v, -7, 0, -7, 3, 6, 3, 0);
  box(v, 5, 0, -7, 3, 6, 3, 0);
  box(v, -7, 0, 5, 3, 5, 3, 0);
  box(v, 5, 0, 5, 3, 5, 3, 0);
  lantern(v, -6, 6, -6);
  lantern(v, 6, 6, -6);
  lantern(v, -6, 5, 6);
  lantern(v, 6, 5, 6);
  for (let i = 0; i < 5; i++) box(v, -5 + i * 2, 2, -6, 1, 3 + (i % 2), 1, 2);
  stairs(v, -3, 0, 6, 4, 1);
  if (seed % 3 === 0) ring(v, 0, 14, 0, 2, 2, 8, 2);
  return v;
}

function silo(seed: number): Voxel[] {
  const v: Voxel[] = [];
  cylinder(v, -4, 0, 0, 2, 12, 0);
  cylinder(v, 4, 0, 0, 2, 11, 0);
  box(v, -3, 12, -1, 2, 2, 2, 2);
  box(v, 3, 11, -1, 2, 2, 2, 2);
  add(v, -4, 14, 0, 2);
  add(v, 4, 13, 0, 2);
  box(v, -3, 7, -1, 8, 2, 2, 1);
  box(v, -1, 0, -1, 3, 3, 3, 1);
  box(v, -7, 4, 0, 3, 1, 1, 2);
  box(v, 6, 5, 0, 3, 1, 1, 2);
  box(v, -4, 3, 3, 1, 1, 3, 2);
  box(v, 4, 3, 3, 1, 1, 3, 2);
  lantern(v, 0, 9, 0);
  if (seed % 2 === 1) cylinder(v, 0, -4, 0, 1, 8, 1);
  return v;
}

function hall(seed: number): Voxel[] {
  const v: Voxel[] = [];
  box(v, -7, 0, -4, 15, 2, 9, 1);
  box(v, -6, 2, -3, 13, 4, 7, 0);
  box(v, -5, 6, -2, 11, 1, 5, 1);
  box(v, -3, 7, -1, 7, 1, 3, 0);
  box(v, -1, 8, 0, 3, 1, 1, 2);
  box(v, -9, 0, -3, 3, 9, 5, 0);
  box(v, 7, 0, -3, 3, 9, 5, 0);
  box(v, -8, 9, -1, 1, 4, 1, 2);
  box(v, 8, 9, -1, 1, 4, 1, 2);
  for (const x of [-5, -2, 1, 4]) {
    add(v, x, 3, -4, 2);
    add(v, x, 3, 3, 2);
  }
  stairs(v, -2, 0, 5, 3, 1);
  box(v, -1, 1, 5, 3, 4, 3, 1);
  lantern(v, -8, 4, 2);
  lantern(v, 8, 4, 2);
  if (seed % 2 === 0) {
    box(v, 0, 9, 0, 1, 3, 1, 2);
    add(v, 0, 12, 0, 2);
  }
  return v;
}

function market(seed: number): Voxel[] {
  const v: Voxel[] = [];
  box(v, -7, 0, -5, 5, 3, 4, 1);
  box(v, -1, 0, -6, 4, 2, 4, 0);
  box(v, 4, 0, -4, 5, 4, 4, 1);
  box(v, -5, 0, 2, 5, 2, 5, 0);
  box(v, 2, 0, 2, 4, 5, 4, 1);
  box(v, -6, 3, -4, 13, 1, 10, 2);
  add(v, 0, 4, 0, 2);
  add(v, 0, 5, 0, 2);
  add(v, 0, 6, 0, 2);
  add(v, 0, 7, 0, 2);
  box(v, -8, 0, 0, 1, 6, 1, 2);
  box(v, 8, 0, 1, 1, 6, 1, 2);
  lantern(v, -8, 6, 0);
  lantern(v, 8, 6, 1);
  add(v, -6, 1, -6, 2);
  add(v, 6, 1, 5, 2);
  add(v, -3, 1, 5, 2);
  add(v, 5, 1, -5, 2);
  box(v, -2, 0, -1, 2, 1, 2, 2);
  box(v, 1, 0, 0, 2, 1, 2, 2);
  if (seed % 3 === 1) box(v, -3, 0, -8, 3, 3, 3, 0);
  return v;
}

function spire(seed: number): Voxel[] {
  const v: Voxel[] = [];
  box(v, -4, 0, -4, 9, 3, 9, 1);
  box(v, -3, 3, -3, 7, 3, 7, 0);
  box(v, -2, 6, -2, 5, 4, 5, 1);
  box(v, -1, 10, -1, 3, 5, 3, 0);
  box(v, 0, 15, 0, 1, 8, 1, 2);
  box(v, -4, 13, 0, 9, 1, 1, 2);
  box(v, 0, 13, -4, 1, 1, 9, 2);
  add(v, 0, 23, 0, 2);
  add(v, 0, 24, 0, 2);
  add(v, 0, 25, 0, 2);
  box(v, -5, 2, -1, 2, 5, 2, 0);
  box(v, 4, 2, -1, 2, 5, 2, 0);
  lantern(v, -3, 3, -4);
  lantern(v, 3, 3, -4);
  if (seed % 3 === 0) ring(v, 0, 17, 0, 3, 3, 12, 0);
  else if (seed % 3 === 1) {
    ring(v, 0, 16, 0, 2, 2, 8, 2);
    ring(v, 0, 19, 0, 2, 2, 8, 0);
  } else {
    box(v, -1, 18, -1, 3, 1, 3, 0);
  }
  return v;
}

function forge(seed: number): Voxel[] {
  const v: Voxel[] = [];
  box(v, -7, 0, -5, 15, 3, 4, 1);
  box(v, -7, 0, -5, 4, 5, 11, 1);
  box(v, 4, 0, -5, 4, 5, 11, 1);
  box(v, -6, 0, 5, 13, 3, 3, 0);
  box(v, -1, 0, -1, 3, 2, 3, 2);
  chimney(v, 5, 2, 5, 11);
  box(v, 6, 8, -2, 1, 1, 8, 2);
  box(v, 5, 8, -2, 3, 1, 1, 2);
  add(v, 6, 9, -2, 2);
  box(v, -5, 5, -5, 2, 1, 1, 2);
  box(v, 0, 5, -5, 2, 1, 1, 2);
  box(v, 3, 5, -5, 2, 1, 1, 2);
  add(v, -6, 2, 1, 2);
  add(v, 2, 2, 6, 2);
  add(v, -2, 3, 6, 2);
  lantern(v, -7, 5, 0);
  if (seed % 2 === 0) box(v, -4, 3, 2, 3, 4, 3, 0);
  return v;
}

function track(seed: number): Voxel[] {
  const v: Voxel[] = [];
  ring(v, 0, 0, 0, 7, 5, 28, 1);
  ring(v, 0, 1, 0, 7, 5, 28, 0);
  ring(v, 0, 0, 0, 5, 3, 20, 0);
  box(v, -3, 0, 5, 7, 5, 5, 1);
  box(v, -2, 5, 6, 5, 2, 3, 0);
  box(v, -8, 0, -1, 1, 8, 1, 2);
  box(v, 8, 0, -1, 1, 8, 1, 2);
  box(v, 0, 0, -7, 1, 8, 1, 2);
  lantern(v, -8, 8, -1);
  lantern(v, 8, 8, -1);
  lantern(v, 0, 8, -7);
  add(v, 0, 2, 6, 2);
  box(v, -1, 0, -1, 3, 1, 3, 2);
  if (seed % 2 === 1) ring(v, 0, 2, 0, 7, 5, 12, 2);
  return v;
}

function sanctuary(seed: number): Voxel[] {
  const v: Voxel[] = [];
  if (seed % 2 === 1) {
    box(v, -2, 0, -2, 5, 3, 5, 1);
    box(v, -1, 3, -1, 3, 7, 3, 0);
    box(v, 0, 10, 0, 1, 5, 1, 2);
    ring(v, 0, 0, 0, 6, 6, 18, 1);
    ring(v, 0, 1, 0, 6, 6, 18, 0);
    ring(v, 0, 2, 0, 4, 4, 12, 2);
    lantern(v, 4, 2, 4);
    lantern(v, -5, 2, 3);
    lantern(v, 3, 2, -5);
    box(v, -7, 0, -1, 2, 4, 2, 0);
    box(v, 6, 0, 0, 2, 4, 2, 0);
    add(v, 0, 15, 0, 2);
    return v;
  }
  box(v, -3, 0, -6, 7, 4, 13, 1);
  box(v, -6, 0, -3, 13, 4, 7, 1);
  box(v, -4, 4, -4, 9, 1, 9, 0);
  box(v, -3, 5, -3, 7, 1, 7, 0);
  box(v, -2, 6, -2, 5, 1, 5, 1);
  box(v, -1, 7, -1, 3, 1, 3, 2);
  add(v, 0, 8, 0, 2);
  add(v, 0, 9, 0, 2);
  add(v, 0, 10, 0, 2);
  lantern(v, -5, 4, 0);
  lantern(v, 5, 4, 0);
  lantern(v, 0, 4, -5);
  lantern(v, 0, 4, 5);
  box(v, -1, 0, -1, 3, 2, 3, 2);
  return v;
}

function lab(seed: number): Voxel[] {
  const v: Voxel[] = [];
  cylinder(v, 0, 0, 0, 2, 10, 1);
  box(v, -1, 10, -1, 3, 3, 3, 0);
  add(v, 0, 13, 0, 2);
  add(v, 0, 14, 0, 2);
  add(v, 0, 15, 0, 2);
  ring(v, 0, 8, 0, 6, 6, 20, 2);
  ring(v, 0, 7, 0, 6, 6, 20, 0);
  ring(v, 0, 6, 0, 5, 5, 16, 1);
  box(v, 3, 0, -4, 7, 5, 6, 1);
  box(v, 7, 5, -1, 2, 6, 2, 2);
  box(v, 6, 10, -2, 4, 1, 4, 0);
  add(v, 8, 11, 0, 2);
  add(v, 9, 11, 0, 2);
  lantern(v, -2, 4, -2);
  lantern(v, 2, 5, 2);
  lantern(v, 5, 2, 1);
  if (seed % 2 === 0) cylinder(v, -5, 3, 0, 1, 6, 0);
  return v;
}

const BUILDERS: Record<BuildingKind, (seed: number) => Voxel[]> = {
  kitchen,
  archive,
  silo,
  hall,
  market,
  spire,
  forge,
  track,
  sanctuary,
  lab,
};

export function voxelsForKind(kind: BuildingKind, seed = 0, complexity = 1): Voxel[] {
  const c = Math.max(1, Math.min(5, Math.round(complexity)));
  const raw = (BUILDERS[kind] ?? hall)(seed);
  const maxY = Math.max(0, ...raw.map((v) => v.y));
  const keepY = Math.max(2, Math.round(maxY * (0.3 + c * 0.14)));
  const kept = c >= 5 ? raw : raw.filter((v) => v.y <= keepY);
  if (c >= 4) kept.push(...ornaments(kind, seed, c, keepY));
  return normalize(kept);
}

function ornaments(kind: BuildingKind, seed: number, c: number, roof: number): Voxel[] {
  const v: Voxel[] = [];
  lantern(v, 4, roof + 1, 2);
  lantern(v, -4, roof + 1, -1);
  if (c < 5) return v;
  box(v, 6, 0, -2, 4, Math.max(4, Math.round(roof * 0.45)), 4, 0);
  box(v, -2, roof, -1, 6, 1, 1, 2);
  chimney(v, 7, 0, Math.max(3, Math.round(roof * 0.4)), 5 + (seed % 3));
  if (kind === "silo" || kind === "kitchen") cylinder(v, 0, 6, 0, 2, 7 + (seed % 4), 0);
  if (kind === "lab" || kind === "spire") ring(v, 0, roof + 2, 0, 3, 3, 10, 2);
  if (kind === "hall" || kind === "archive") {
    box(v, -8, 0, 2, 3, roof, 3, 1);
    lantern(v, -7, roof + 1, 3);
  }
  if (kind === "forge" || kind === "track") box(v, -7, 0, 4, 3, 5, 3, 0);
  if (kind === "market" || kind === "sanctuary") {
    lantern(v, 0, roof + 2, 0);
    add(v, 0, roof + 3, 0, 2);
  }
  return v;
}

export function splitVoxels(voxels: Voxel[], freshness: number) {
  const sorted = [...voxels].sort((a, b) => b.y - a.y || b.x - a.x || b.z - a.z);
  const decay = 1 - Math.min(1, Math.max(0, freshness));
  const shedCount = Math.round(Math.pow(decay, 1.15) * sorted.length);
  const missing = sorted.slice(0, shedCount);
  return {
    intact: sorted.slice(shedCount),
    shed: missing.slice(0, 36),
  };
}

export function hashSeed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Shared layout so orbit and surface show the same angular arrangement. */
export function buildingAnchor(index: number, total: number) {
  const theta = (index / Math.max(total, 1)) * Math.PI * 2 + 0.55;
  const lift = 0.28 + (index % 3) * 0.1;
  return { theta, lift };
}

export function spherePoint(radius: number, theta: number, lift: number) {
  const phi = Math.PI / 2 - lift;
  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}
