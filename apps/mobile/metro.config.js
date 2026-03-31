const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// Let Metro know where to resolve packages from monorepo
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Resolve Node.js built-in modules that don't exist in React Native
// 'crypto' is conditionally required in @myphoto/shared but not needed at runtime
// because globalThis.crypto.getRandomValues is polyfilled via react-native-get-random-values
config.resolver.extraNodeModules = {
  crypto: path.resolve(projectRoot, 'shims/crypto.js'),
};

module.exports = config;
