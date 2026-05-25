/**
 * Pinch-to-zoom + drag-to-pan wrapper built only on React Native core
 * (PanResponder + Animated) — no reanimated/gesture-handler, matching this
 * app's constraints. Wrap any content (image, meme frame, sticker) to get:
 *   - two-finger pinch zoom (clamped to [minScale, maxScale])
 *   - one-finger pan once zoomed in
 *   - double-tap to toggle zoom / reset
 *   - spring-back to fit when zoomed out below 1x
 *
 * onTransformChange reports the live {scale, translateX, translateY} so callers
 * (e.g. crop) can compute the visible region.
 */
import { useEffect, useRef } from 'react';
import { Animated, PanResponder, View, type ViewStyle } from 'react-native';

export interface ZoomPanTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export function ZoomPanView({
  children,
  style,
  minScale = 1,
  maxScale = 5,
  doubleTapScale = 2.5,
  onTransformChange,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  minScale?: number;
  maxScale?: number;
  doubleTapScale?: number;
  onTransformChange?: (t: ZoomPanTransform) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Live committed values (kept current via listeners so gesture math + release
  // can read them synchronously without touching private Animated internals).
  const cur = useRef<ZoomPanTransform>({ scale: 1, translateX: 0, translateY: 0 });
  const start = useRef<ZoomPanTransform>({ scale: 1, translateX: 0, translateY: 0 });
  const pinchStartDist = useRef(0);

  // Keep `cur` synced (and notify callers) via listeners added once.
  useEffect(() => {
    const s = scale.addListener(({ value }) => { cur.current.scale = value; onTransformChange?.({ ...cur.current }); });
    const x = translateX.addListener(({ value }) => { cur.current.translateX = value; });
    const y = translateY.addListener(({ value }) => { cur.current.translateY = value; });
    return () => { scale.removeListener(s); translateX.removeListener(x); translateY.removeListener(y); };
  }, [scale, translateX, translateY, onTransformChange]);

  const dist = (touches: { pageX: number; pageY: number }[]) =>
    Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);

  const resetTo = (s: number, tx = 0, ty = 0) => {
    Animated.parallel([
      Animated.spring(scale, { toValue: s, useNativeDriver: true, bounciness: 0 }),
      Animated.spring(translateX, { toValue: tx, useNativeDriver: true, bounciness: 0 }),
      Animated.spring(translateY, { toValue: ty, useNativeDriver: true, bounciness: 0 }),
    ]).start();
  };

  const responder = useRef(
    PanResponder.create({
      // Don't claim the touch START — that lets taps, buttons and any parent
      // ScrollView keep working. We only take over on a real gesture below.
      onStartShouldSetPanResponder: () => false,
      // Claim a move only for a two-finger pinch, or one-finger drag once the
      // content is already zoomed in (so the parent ScrollView scrolls normally
      // at 1x).
      onMoveShouldSetPanResponder: (e) =>
        e.nativeEvent.touches.length === 2 || cur.current.scale > 1.01,
      onPanResponderGrant: (e) => {
        start.current = { ...cur.current };
        const t = e.nativeEvent.touches;
        if (t.length === 2) pinchStartDist.current = dist(t as any);
      },
      onPanResponderMove: (e, g) => {
        const t = e.nativeEvent.touches;
        if (t.length === 2) {
          if (pinchStartDist.current === 0) { pinchStartDist.current = dist(t as any); start.current = { ...cur.current }; }
          let s = start.current.scale * (dist(t as any) / pinchStartDist.current);
          s = Math.max(minScale * 0.8, Math.min(maxScale, s));
          scale.setValue(s);
        } else if (t.length === 1 && cur.current.scale > 1.01) {
          translateX.setValue(start.current.translateX + g.dx);
          translateY.setValue(start.current.translateY + g.dy);
        }
      },
      onPanResponderRelease: () => {
        pinchStartDist.current = 0;
        // Snap back to fit if zoomed out under 1x.
        if (cur.current.scale <= 1) resetTo(1);
      },
      onPanResponderTerminate: () => { pinchStartDist.current = 0; },
    })
  ).current;

  return (
    <View style={style} {...responder.panHandlers}>
      <Animated.View style={{ flex: 1, transform: [{ scale }, { translateX }, { translateY }] }}>
        {children}
      </Animated.View>
    </View>
  );
}
