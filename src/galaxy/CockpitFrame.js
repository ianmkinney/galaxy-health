import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// Canopy chrome drawn over the viewport: hull above, angled pillars at the
// sides, a vignette, and a reflection that crawls across the glass. Purely
// decorative and never interactive — `pointerEvents` stays off so planets
// underneath stay tappable.
const CockpitFrame = memo(({ width, height, animate = true, accent = '#6FDBFF' }) => {
  const sheen = useSharedValue(0);

  useEffect(() => {
    if (!animate) return undefined;
    sheen.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return undefined;
  }, [animate, sheen]);

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: 0.05 + sheen.value * 0.09,
    transform: [{ translateX: -width * 0.6 + sheen.value * width * 1.2 }, { rotateZ: '14deg' }],
  }));

  const canopyDrop = height * 0.11;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="hull" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#070B15" stopOpacity="1" />
            <Stop offset="1" stopColor="#0F1830" stopOpacity="0.92" />
          </LinearGradient>
          <RadialGradient id="vignette" cx="50%" cy="42%" r="72%">
            <Stop offset="0.55" stopColor="#000000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.72" />
          </RadialGradient>
        </Defs>

        {/* Canopy header with a curved lower lip */}
        <Path
          d={`M0 0 H${width} V${canopyDrop} Q${width / 2} ${canopyDrop + height * 0.075} 0 ${canopyDrop} Z`}
          fill="url(#hull)"
        />
        <Path
          d={`M0 ${canopyDrop} Q${width / 2} ${canopyDrop + height * 0.075} ${width} ${canopyDrop}`}
          stroke={accent}
          strokeOpacity={0.32}
          strokeWidth={1.4}
          fill="none"
        />

        {/* Angled A-pillars */}
        <Path
          d={`M0 ${canopyDrop * 0.7} L${width * 0.13} ${height} L0 ${height} Z`}
          fill="url(#hull)"
        />
        <Path
          d={`M${width} ${canopyDrop * 0.7} L${width * 0.87} ${height} L${width} ${height} Z`}
          fill="url(#hull)"
        />
        <Path
          d={`M0 ${canopyDrop * 0.7} L${width * 0.13} ${height}`}
          stroke={accent}
          strokeOpacity={0.22}
          strokeWidth={1.2}
        />
        <Path
          d={`M${width} ${canopyDrop * 0.7} L${width * 0.87} ${height}`}
          stroke={accent}
          strokeOpacity={0.22}
          strokeWidth={1.2}
        />

        <Rect x={0} y={0} width={width} height={height} fill="url(#vignette)" />

        {/* Boresight reticle */}
        <Path
          d={`M${width / 2 - 16} ${height * 0.44} H${width / 2 - 5}
              M${width / 2 + 5} ${height * 0.44} H${width / 2 + 16}
              M${width / 2} ${height * 0.44 - 16} V${height * 0.44 - 5}
              M${width / 2} ${height * 0.44 + 5} V${height * 0.44 + 16}`}
          stroke={accent}
          strokeOpacity={0.3}
          strokeWidth={1}
        />
      </Svg>

      {animate ? (
        <Animated.View style={[styles.sheen, { height: height * 1.4 }, sheenStyle]} />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  sheen: {
    position: 'absolute',
    top: -40,
    width: 90,
    backgroundColor: '#BFF4FF',
  },
});

CockpitFrame.displayName = 'CockpitFrame';

export default CockpitFrame;
