// Neural core geometry for the SVG canopy — no sun.
// Points on a harmonic sphere, axons that jag through a jittered nucleus.

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const hash = (n) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

const harmonic = (theta, phi) =>
  1 + 0.12 * Math.sin(3 * theta) * Math.cos(2 * phi) + 0.07 * Math.cos(4 * phi);

export const buildNeuralCore2d = (radius = 42, pointCount = 48, axonCount = 18) => {
  const points = [];
  for (let i = 0; i < pointCount; i += 1) {
    const y = 1 - (i / (pointCount - 1)) * 2;
    const rY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN * i;
    const phi = Math.acos(Math.max(-1, Math.min(1, y)));
    const r = radius * harmonic(theta, phi);
    const x3 = Math.cos(theta) * rY * r;
    const y3 = y * r;
    const z3 = Math.sin(theta) * rY * r;
    // Simple tilt so the lattice reads as a ball, not a disc.
    points.push({ x: x3, y: -y3 * 0.82 - z3 * 0.35 });
  }

  const pathD = (from, to, seed) => {
    const steps = 6;
    let d = `M ${from.x.toFixed(1)} ${from.y.toFixed(1)}`;
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const pull = Math.sin(Math.PI * t);
      const nx = from.x + (to.x - from.x) * t;
      const ny = from.y + (to.y - from.y) * t;
      const jx = (hash(seed + i) - 0.5) * 18 * pull;
      const jy = (hash(seed + i * 3) - 0.5) * 18 * pull;
      d += ` L ${(nx + jx - pull * (nx * 0.45)).toFixed(1)} ${(ny + jy - pull * (ny * 0.45)).toFixed(1)}`;
    }
    return d;
  };

  const axons = [];
  for (let i = 0; i < axonCount; i += 1) {
    const a = points[Math.floor(hash(i + 0.2) * points.length)];
    const b = points[Math.floor(hash(i + 4.7) * points.length)];
    if (!a || !b || a === b) continue;
    axons.push(pathD(a, b, i * 1.7));
  }

  return { points, axons };
};
