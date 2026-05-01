const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const mobileModules = path.resolve(projectRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

// Watch shared packages
config.watchFolders = [
  path.resolve(monorepoRoot, 'packages'),
];

// Resolve from mobile first, then monorepo root
config.resolver.nodeModulesPaths = [
  mobileModules,
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = false;

config.resolver.extraNodeModules = {
  crypto: path.resolve(projectRoot, 'shims/crypto.js'),
};

// Force React 19 from mobile's node_modules (root has React 18 for web)
const localReactDir = path.resolve(mobileModules, 'react');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    const subpath = moduleName === 'react' ? '' : moduleName.slice('react'.length);
    try {
      const resolved = subpath
        ? require.resolve(localReactDir + subpath)
        : require.resolve(localReactDir);
      return { type: 'sourceFile', filePath: resolved };
    } catch (e) {
      // fall through to default
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
