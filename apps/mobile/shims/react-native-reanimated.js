// Complete shim for react-native-reanimated
// Provides all API surface that expo-router and react-native-screens need.
// Uses React Native's built-in Animated API as fallback.

const React = require('react');
const { Animated, View, Text, Image, ScrollView, FlatList, Platform } = require('react-native');

// --- Shared Values ---
function useSharedValue(init) {
  const ref = React.useRef({ value: init, _isSharedValue: true });
  return ref.current;
}

function useAnimatedStyle(updater, deps) {
  return updater();
}

function useDerivedValue(updater, deps) {
  return { value: typeof updater === 'function' ? updater() : updater };
}

function useAnimatedScrollHandler(handlers) {
  return function () {};
}

function useAnimatedRef() {
  return React.useRef(null);
}

function useAnimatedProps(updater) {
  return updater();
}

// --- useEvent (required by react-native-screens) ---
function useEvent(handler, eventNames, rebuild) {
  return handler;
}

// --- Animations ---
function withTiming(toValue, config, callback) {
  if (callback) callback(true);
  return toValue;
}

function withSpring(toValue, config, callback) {
  if (callback) callback(true);
  return toValue;
}

function withDelay(delay, animation) {
  return animation;
}

function withSequence(...animations) {
  return animations[animations.length - 1];
}

function withRepeat(animation) {
  return animation;
}

function withDecay(config) {
  return 0;
}

function cancelAnimation() {}

// --- Worklet runners ---
function runOnJS(fn) {
  return function (...args) {
    return fn(...args);
  };
}

function runOnUI(fn) {
  return function (...args) {
    return fn(...args);
  };
}

// --- Animated Components ---
function createAnimatedComponent(Component) {
  const AnimatedComp = React.forwardRef((props, ref) => {
    return React.createElement(Component, { ...props, ref });
  });
  AnimatedComp.displayName = `AnimatedComponent(${Component.displayName || Component.name || 'Component'})`;
  return AnimatedComp;
}

const AnimatedView = Animated.View || View;
const AnimatedText = Animated.Text || Text;
const AnimatedImage = Animated.Image || Image;
const AnimatedScrollView_ = Animated.ScrollView || ScrollView;
const AnimatedFlatList_ = Animated.FlatList || FlatList;

// --- Layout Animations ---
const noopLayout = { build: () => ({}) };
const noopLayoutFn = Object.assign(() => noopLayout, {
  duration: () => noopLayout,
  delay: () => noopLayout,
  springify: () => noopLayout,
  damping: () => noopLayout,
  build: () => ({}),
});

// --- Screen Transition (for react-native-screens) ---
class ScreenTransition {
  static SwipeRight = {};
  static SwipeLeft = {};
  static SwipeDown = {};
  static SwipeUp = {};
  static Horizontal = {};
  static Vertical = {};
}

// --- Easing ---
const Easing = {
  linear: (t) => t,
  ease: (t) => t,
  quad: (t) => t * t,
  cubic: (t) => t * t * t,
  bezier: () => (t) => t,
  in: (fn) => fn || ((t) => t),
  out: (fn) => fn || ((t) => t),
  inOut: (fn) => fn || ((t) => t),
  circle: (t) => t,
  back: () => (t) => t,
  elastic: () => (t) => t,
  bounce: (t) => t,
};

// --- Interpolation ---
function interpolate(value, inputRange, outputRange) {
  if (!inputRange || !outputRange || inputRange.length < 2) return value;
  const ratio = (value - inputRange[0]) / (inputRange[inputRange.length - 1] - inputRange[0]);
  return outputRange[0] + ratio * (outputRange[outputRange.length - 1] - outputRange[0]);
}

const Extrapolation = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };

// --- Measure ---
function measure() { return null; }
function scrollTo() {}

// --- Default Export (Animated namespace) ---
const ReanimatedDefault = {
  View: AnimatedView,
  Text: AnimatedText,
  Image: AnimatedImage,
  ScrollView: AnimatedScrollView_,
  FlatList: AnimatedFlatList_,
  createAnimatedComponent,
  call: () => {},
};

// --- Module Exports ---
const moduleExports = {
  __esModule: true,
  default: ReanimatedDefault,
  // Hooks
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useAnimatedScrollHandler,
  useAnimatedRef,
  useAnimatedProps,
  useEvent,
  // Animations
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  withDecay,
  cancelAnimation,
  // Runners
  runOnJS,
  runOnUI,
  // Components
  createAnimatedComponent,
  View: AnimatedView,
  Text: AnimatedText,
  Image: AnimatedImage,
  ScrollView: AnimatedScrollView_,
  FlatList: AnimatedFlatList_,
  // Layout Animations
  FadeIn: noopLayoutFn,
  FadeOut: noopLayoutFn,
  FadeInUp: noopLayoutFn,
  FadeInDown: noopLayoutFn,
  FadeOutUp: noopLayoutFn,
  FadeOutDown: noopLayoutFn,
  SlideInRight: noopLayoutFn,
  SlideInLeft: noopLayoutFn,
  SlideOutRight: noopLayoutFn,
  SlideOutLeft: noopLayoutFn,
  ZoomIn: noopLayoutFn,
  ZoomOut: noopLayoutFn,
  Layout: noopLayoutFn,
  LinearTransition: noopLayoutFn,
  SequencedTransition: noopLayoutFn,
  FadingTransition: noopLayoutFn,
  // Screen Transition
  ScreenTransition,
  // Easing
  Easing,
  // Interpolation
  interpolate,
  Extrapolation,
  // Measure
  measure,
  scrollTo,
  // Reduce motion
  ReduceMotion: { System: 0, Always: 1, Never: 2 },
  useReducedMotion: function () { return false; },
  // Shared transition (react-native-screens v4)
  SharedTransition: {
    custom: function () { return { registerTransition: function () {} }; },
    defaultTransitionType: function () { return {}; },
    progressAnimation: function () { return { registerTransition: function () {} }; },
  },
  SharedTransitionType: { ANIMATION: 0, PROGRESS_ANIMATION: 1 },
  ReducedMotionConfig: { System: 0, Always: 1, Never: 2 },
  // Sensors
  SensorType: { ROTATION: 1, ACCELEROMETER: 2, GYROSCOPE: 3, GRAVITY: 4, MAGNETIC_FIELD: 5 },
  useAnimatedSensor: function () { return { sensor: { value: { x: 0, y: 0, z: 0 } } }; },
  // Keyboard
  useAnimatedKeyboard: function () { return { state: { value: 0 }, height: { value: 0 } }; },
  KeyboardState: { UNKNOWN: 0, OPENING: 1, OPEN: 2, CLOSING: 3, CLOSED: 4 },
  // Gesture handler interop
  useAnimatedGestureHandler: function () { return {}; },
  useAnimatedReaction: function () {},
  // Additional hooks needed by screens
  useFrameCallback: function () {},
  useScrollViewOffset: function () { return { value: 0 }; },
  useAnimatedScrollHandler: function () { return function () {}; },
  // enteringAnimation / exitingAnimation
  EntryExitTransition: noopLayoutFn,
  combineTransition: function () { return noopLayoutFn; },
  // Status
  isConfigured: function () { return true; },
  getViewProp: function () { return Promise.resolve(undefined); },
  // Make sure default export also has all hooks
  makeMutable: function (init) { return { value: init }; },
  enableLayoutAnimations: function () {},
  configureLayoutAnimationBatch: function () {},
  isSharedValue: function () { return false; },
};

module.exports = moduleExports;
