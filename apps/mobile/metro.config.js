const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// pnpm monorepo: resolve packages from both project and workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Ensure Metro can find symlinked workspace packages
config.resolver.disableHierarchicalLookup = false;

// Shim Node.js crypto module for React Native
config.resolver.extraNodeModules = {
  crypto: path.resolve(projectRoot, 'shims/crypto.js'),
};

module.exports = config;
