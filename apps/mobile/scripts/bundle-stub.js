#!/usr/bin/env node
// Drop-in replacement for `expo export:embed` that copies a
// pre-bundled JS bundle + asset tree into Gradle's expected output
// locations.
//
// Why: when the Android Gradle build runs the real `expo export:embed`
// task in this monorepo, Metro's projectRoot detection lands on the
// monorepo root and ends up looking for ./../../node_modules/expo-router/entry.js
// one directory too high. Bundling works fine when invoked directly
// from apps/mobile/, so we pre-bundle there and let Gradle's bundle
// task call this stub instead — Gradle sees a "successful" bundle and
// downstream tasks (packageReleaseResources, mergeReleaseAssets)
// proceed without needing the broken Metro invocation.
//
// Usage: node bundle-stub.js export:embed --platform android \
//          --bundle-output <gradle-out> --assets-dest <gradle-res> [other args ignored]
//
// Reads SOURCE_BUNDLE_DIR env (default: C:/Users/User/AppData/Local/Temp/myphoto-bundle)
// and expects:
//   <SOURCE_BUNDLE_DIR>/index.android.bundle
//   <SOURCE_BUNDLE_DIR>/assets/...     (drawable-* + raw/)

const fs = require('fs');
const path = require('path');

const SOURCE = process.env.SOURCE_BUNDLE_DIR || 'C:/Users/User/AppData/Local/Temp/myphoto-bundle';
const SOURCE_BUNDLE = path.join(SOURCE, 'index.android.bundle');
const SOURCE_ASSETS = path.join(SOURCE, 'assets');

const args = process.argv.slice(2);
const getArg = (name) => {
  // Supports both "--name value" and "--name=value" forms — the
  // React Native Gradle plugin uses the space form, but be liberal.
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name && i + 1 < args.length) return args[i + 1];
    if (args[i].startsWith(name + '=')) return args[i].slice(name.length + 1);
  }
  return null;
};

const bundleOutput = getArg('--bundle-output');
const assetsDest = getArg('--assets-dest');

if (!bundleOutput) {
  console.error('bundle-stub: --bundle-output missing in args');
  process.exit(1);
}
if (!fs.existsSync(SOURCE_BUNDLE)) {
  console.error(`bundle-stub: source bundle not found at ${SOURCE_BUNDLE}`);
  console.error('Pre-bundle first: cd apps/mobile && npx expo export:embed ...');
  process.exit(1);
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

fs.mkdirSync(path.dirname(bundleOutput), { recursive: true });
fs.copyFileSync(SOURCE_BUNDLE, bundleOutput);
console.log(`bundle-stub: copied ${SOURCE_BUNDLE} -> ${bundleOutput}`);

if (assetsDest) {
  copyRecursive(SOURCE_ASSETS, assetsDest);
  console.log(`bundle-stub: copied ${SOURCE_ASSETS} -> ${assetsDest}`);
}

// Also write the sourcemap path the RN plugin expects, even if empty,
// so the "createBundleReleaseSourcemap" downstream isn't surprised.
const sourcemapOutput = getArg('--sourcemap-output');
if (sourcemapOutput) {
  fs.mkdirSync(path.dirname(sourcemapOutput), { recursive: true });
  if (!fs.existsSync(sourcemapOutput)) {
    fs.writeFileSync(sourcemapOutput, '{"version":3,"sources":[],"names":[],"mappings":""}');
  }
}

process.exit(0);
