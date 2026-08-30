// A tiny 3D pipeline: orbital position -> world space -> perspective projection.
//
// Every function is a worklet so the whole scene can be evaluated on the UI
// thread each frame without crossing the JS bridge. There is no WebGL here; the
// scene is a handful of spheres, so a software projection is cheaper, renders
// identically on web and in Expo Go, and needs no native module beyond SVG.

// Camera sits on -Z looking toward +Z. `tilt` leans the ecliptic toward us, which
// is what turns circular orbits into the ellipses you actually see out a canopy.
export const CAMERA = {
  focal: 3.4,
  distance: 3.4,
  tilt: 0.52, // radians, ~30 degrees above the orbital plane
};

export const TILT_SIN = Math.sin(CAMERA.tilt);
export const TILT_COS = Math.cos(CAMERA.tilt);

export const TAU = Math.PI * 2;

// Position on an ellipse with the star at one focus, then tilted into world space.
export function orbitPoint(a, eccentricity, angle) {
  'worklet';
  const r = (a * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(angle));
  const ox = r * Math.cos(angle);
  const oz = r * Math.sin(angle);
  return {
    x: ox,
    y: oz * TILT_SIN,
    z: oz * TILT_COS,
  };
}

// World space -> screen. `k` is the perspective factor: > 1 is nearer than the
// star, < 1 is further. Callers reuse it for apparent size and haze.
export function project(x, y, z, scale) {
  'worklet';
  const zc = z + CAMERA.distance;
  const k = CAMERA.focal / (zc < 0.2 ? 0.2 : zc);
  return {
    sx: x * scale * k,
    sy: -y * scale * k,
    k,
  };
}

// Convenience: orbital angle -> screen, in one worklet call.
export function projectOrbit(a, eccentricity, angle, scale) {
  'worklet';
  const p = orbitPoint(a, eccentricity, angle);
  const s = project(p.x, p.y, p.z, scale);
  return { sx: s.sx, sy: s.sy, k: s.k, z: p.z };
}

// Angle for a planet at loop progress `t` (0..1). `revs` is a whole number of
// revolutions per loop, so t = 1 lands exactly back on t = 0 and the shared
// clock can repeat forever without a visible jump.
export function orbitAngle(phase, revs, t) {
  'worklet';
  return phase + t * TAU * revs;
}

// A signal's trajectory: 3D interpolation between two planets, bowed out of the
// orbital plane and pulled toward the camera so the arc reads as a real flight.
export function signalPoint(from, to, t) {
  'worklet';
  const bow = Math.sin(Math.PI * t);
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t + bow * 0.16,
    z: from.z + (to.z - from.z) * t - bow * 0.22,
  };
}

// Far side of the system is hazier. Keeps depth readable without a z-buffer.
export function depthOpacity(k) {
  'worklet';
  const normalized = (k - 0.75) / 0.65; // k spans roughly 0.75..1.40
  const clamped = normalized < 0 ? 0 : normalized > 1 ? 1 : normalized;
  return 0.55 + clamped * 0.45;
}

// Non-worklet twin used to lay out static geometry (orbit rings, star field).
export const projectStatic = (a, eccentricity, angle, scale) => {
  const r = (a * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(angle));
  const ox = r * Math.cos(angle);
  const oz = r * Math.sin(angle);
  const y = oz * TILT_SIN;
  const z = oz * TILT_COS;
  const zc = z + CAMERA.distance;
  const k = CAMERA.focal / Math.max(zc, 0.2);
  return { sx: ox * scale * k, sy: -y * scale * k, k, z };
};

// Build an SVG path for one orbit. Split into the half behind the star and the
// half in front so the star and near planets can be drawn between them — cheap
// depth ordering without reordering React children on the UI thread.
export const orbitPaths = (a, eccentricity, scale, segments = 96) => {
  const far = [];
  const near = [];
  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * TAU;
    const point = projectStatic(a, eccentricity, angle, scale);
    const command = `${point.sx.toFixed(2)},${point.sy.toFixed(2)}`;
    // z > 0 is beyond the star from the camera's point of view.
    if (point.z >= 0) {
      far.push(command);
    } else {
      near.push(command);
    }
  }
  const toPath = (points) => (points.length > 1 ? `M${points.join(' L')}` : '');
  return { far: toPath(far), near: toPath(near) };
};
