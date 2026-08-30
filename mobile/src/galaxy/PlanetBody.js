import React, { memo } from 'react';
import Svg, { Circle, Defs, Ellipse, G, RadialGradient, Stop } from 'react-native-svg';

// A static sphere. It never re-renders while orbiting — the parent view is what
// moves — so all the gradient work happens once per planet.
//
// Light comes from the upper-left rather than from the star's true screen
// direction. Tracking the real terminator would mean rotating this SVG every
// frame; the fixed key light reads correctly at these sizes.
const PlanetBody = memo(({ radius, accent, ring = false, box }) => {
  const size = box ?? radius * 4;
  const c = size / 2;
  const id = `${accent.mid.replace('#', '')}-${Math.round(radius)}`;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={`glow-${id}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0.42" stopColor={accent.mid} stopOpacity="0.5" />
          <Stop offset="0.68" stopColor={accent.mid} stopOpacity="0.14" />
          <Stop offset="1" stopColor={accent.mid} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`body-${id}`} cx="34%" cy="30%" r="78%">
          <Stop offset="0" stopColor={accent.core} />
          <Stop offset="0.45" stopColor={accent.mid} />
          <Stop offset="1" stopColor={accent.deep} />
        </RadialGradient>
        <RadialGradient id={`term-${id}`} cx="72%" cy="76%" r="70%">
          <Stop offset="0" stopColor="#000000" stopOpacity="0.62" />
          <Stop offset="0.6" stopColor="#000000" stopOpacity="0.16" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Atmosphere */}
      <Circle cx={c} cy={c} r={radius * 1.95} fill={`url(#glow-${id})`} />

      {ring ? (
        <G opacity={0.75}>
          <Ellipse
            cx={c}
            cy={c}
            rx={radius * 1.85}
            ry={radius * 0.5}
            stroke={accent.core}
            strokeWidth={1.4}
            strokeOpacity={0.55}
            fill="none"
          />
          <Ellipse
            cx={c}
            cy={c}
            rx={radius * 1.5}
            ry={radius * 0.4}
            stroke={accent.mid}
            strokeWidth={2.4}
            strokeOpacity={0.4}
            fill="none"
          />
        </G>
      ) : null}

      {/* Surface, then the night side */}
      <Circle cx={c} cy={c} r={radius} fill={`url(#body-${id})`} />
      <Circle cx={c} cy={c} r={radius} fill={`url(#term-${id})`} />

      {/* Limb light keeps the edge from going flat */}
      <Circle
        cx={c}
        cy={c}
        r={radius}
        stroke={accent.core}
        strokeWidth={0.9}
        strokeOpacity={0.4}
        fill="none"
      />
      <Ellipse
        cx={c - radius * 0.34}
        cy={c - radius * 0.4}
        rx={radius * 0.3}
        ry={radius * 0.19}
        fill="#FFFFFF"
        opacity={0.22}
      />
    </Svg>
  );
});

PlanetBody.displayName = 'PlanetBody';

export default PlanetBody;
