// Explicit autolinking config for packages whose own metadata doesn't
// match the @react-native-community/cli default discovery pattern.
//
// onnxruntime-react-native ships with react-native 0.73's package
// layout and isn't detected by the CLI's scanner in this monorepo,
// so PackageList.java never includes OnnxruntimePackage and the JS
// import throws "module not found" — crashing the app at the splash
// screen before AuthProvider mounts.
module.exports = {
  dependencies: {
    'onnxruntime-react-native': {
      platforms: {
        android: {
          packageImportPath: 'import ai.onnxruntime.reactnative.OnnxruntimePackage;',
          packageInstance: 'new OnnxruntimePackage()',
        },
      },
    },
  },
};
