import * as THREE from "three";

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453123;
  return x - Math.floor(x);
}

/** Radius warp — a compact spherical-harmonic-ish equation, not a perfect ball. */
export function harmonicRadius(theta: number, phi: number) {
  return (
    1 +
    0.12 * Math.sin(3 * theta) * Math.cos(2 * phi) +
    0.07 * Math.cos(4 * phi) +
    0.045 * Math.sin(5 * theta) * Math.sin(phi)
  );
}

export function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const n = Math.max(8, count);
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const rY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN_ANGLE * i;
    const phi = Math.acos(Math.max(-1, Math.min(1, y)));
    const r = radius * harmonicRadius(theta, phi);
    pts.push(new THREE.Vector3(Math.cos(theta) * rY * r, y * r, Math.sin(theta) * rY * r));
  }
  return pts;
}

/**
 * Never a straight chord. The path bows toward a jittered nucleus, then
 * jags with two perpendicular frequencies so it reads as an axon, not a ray.
 */
export function jaggedAxon(
  from: THREE.Vector3,
  to: THREE.Vector3,
  seed: number,
  samples = 56
): THREE.Vector3[] {
  const dir = to.clone().sub(from);
  const up = Math.abs(dir.y) < 0.92 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const n1 = dir.clone().cross(up).normalize();
  const n2 = dir.clone().cross(n1).normalize();
  const nucleus = new THREE.Vector3(
    (hash(seed) - 0.5) * 0.28,
    (hash(seed + 3) - 0.5) * 0.28,
    (hash(seed + 7) - 0.5) * 0.28
  );

  const knots: THREE.Vector3[] = [];
  const steps = 9;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const pull = Math.sin(Math.PI * t);
    const base = from.clone().lerp(to, t);
    const toward = nucleus.clone().sub(base).multiplyScalar(0.62 * pull);
    const jag = n1
      .clone()
      .multiplyScalar((hash(seed + i * 11) - 0.5) * 0.42 * pull)
      .add(n2.clone().multiplyScalar((hash(seed + i * 17 + 1) - 0.5) * 0.42 * pull));
    const buzz = n1
      .clone()
      .multiplyScalar(Math.sin(t * 19 + seed) * 0.07)
      .add(n2.clone().multiplyScalar(Math.cos(t * 23 + seed * 1.7) * 0.07));
    knots.push(base.add(toward).add(jag).add(buzz));
  }

  const curve = new THREE.CatmullRomCurve3(knots, false, "catmullrom", 0.35);
  return curve.getPoints(samples);
}

export type NeuralGraph = {
  points: THREE.Vector3[];
  axons: THREE.Vector3[][];
};

export function buildNeuralGraph(pointCount = 168, axonCount = 72): NeuralGraph {
  const points = fibonacciSphere(pointCount, 0.92);
  const axons: THREE.Vector3[][] = [];

  // Local cortex: each point to a nearby neighbor (angular, never a diameter).
  for (let i = 0; i < points.length; i += 3) {
    const a = points[i];
    let best = (i + 7) % points.length;
    let bestD = a.distanceToSquared(points[best]);
    for (let k = 1; k < 12; k++) {
      const j = (i + k * 11) % points.length;
      const d = a.distanceToSquared(points[j]);
      if (d < bestD && d > 0.04) {
        bestD = d;
        best = j;
      }
    }
    axons.push(jaggedAxon(a, points[best], i + 0.31));
  }

  // Long-range axons through the nucleus — opposite-ish points, still jagged.
  for (let i = 0; i < axonCount; i++) {
    const a = points[Math.floor(hash(i + 0.2) * points.length)];
    const b = points[Math.floor(hash(i + 4.7) * points.length)];
    if (a === b) continue;
    axons.push(jaggedAxon(a, b, i * 1.618));
  }

  return { points, axons };
}

export function orbitWorldPosition(
  a: number,
  eccentricity: number,
  angle: number,
  inclination: number
) {
  const r = (a * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(angle));
  const x = r * Math.cos(angle);
  const z = r * Math.sin(angle);
  const y = z * Math.sin(inclination);
  const zT = z * Math.cos(inclination);
  return new THREE.Vector3(x, y, zT);
}
