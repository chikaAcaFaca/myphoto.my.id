// Shim for react-native-reanimated
// Provides minimal API surface that expo-router and react-native-screens need
// without requiring the native module to be compiled.

const Animated = require('react-native').Animated;

// Minimal shared value mock
function useSharedValue(init) {
  const ref = require('react').useRef({ value: init });
  return ref.current;
}

function useAnimatedStyle(fn) {
  return fn();
}

function useDerivedValue(fn) {
  return { value: fn() };
}

function withTiming(toValue) {
  return toValue;
}

function withSpring(toValue) {
  return toValue;
}

function withDelay(delay, animation) {
  return animation;
}

function runOnJS(fn) {
  return fn;
}

function runOnUI(fn) {
  return fn;
}

// Create animated component wrapper
function createAnimatedComponent(Component) {
  return Component;
}

const AnimatedView = Animated.View || require('react-native').View;
const AnimatedText = Animated.Text || require('react-native').Text;
const AnimatedImage = Animated.Image || require('react-native').Image;
const AnimatedScrollView = Animated.ScrollView || require('react-native').ScrollView;
const AnimatedFlatList = Animated.FlatList || require('react-native').FlatList;

module.exports = {
  default: {
    View: AnimatedView,
    Text: AnimatedText,
    Image: AnimatedImage,
    ScrollView: AnimatedScrollView,
    FlatList: AnimatedFlatList,
    createAnimatedComponent,
  },
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
  runOnUI,
  createAnimatedComponent,
  // Layout animations (no-op)
  FadeIn: { duration: () => ({ build: () => ({}) }) },
  FadeOut: { duration: () => ({ build: () => ({}) }) },
  SlideInRight: { build: () => ({}) },
  SlideOutLeft: { build: () => ({}) },
  Layout: { duration: () => ({ build: () => ({}) }) },
  // Easing
  Easing: {
    linear: (t) => t,
    ease: (t) => t,
    bezier: () => (t) => t,
    in: () => (t) => t,
    out: () => (t) => t,
    inOut: () => (t) => t,
  },
  // Animated components
  View: AnimatedView,
  Text: AnimatedText,
  Image: AnimatedImage,
  ScrollView: AnimatedScrollView,
  FlatList: AnimatedFlatList,
  // Reduce motion
  ReduceMotion: { System: 0, Always: 1, Never: 2 },
  isConfigured: () => true,
  getViewProp: () => Promise.resolve(undefined),
};
