/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@myphoto/shared', '@myphoto/api-client'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.eu-central-2.wasabisys.com',
        port: '',
        pathname: '/myphoto-prod/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    serverComponentsExternalPackages: ['undici'],
  },
  webpack: (config, { isServer }) => {
    const path = require('path');
    // Force resolve react from web's own node_modules to avoid
    // picking up React 19 from monorepo root (mobile uses React 19)
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.resolve(__dirname, 'node_modules/react'),
    };
    // Exclude undici from client-side bundling
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      };
    }
    // Ignore undici module parsing issues
    config.module.rules.push({
      test: /node_modules[\\/]undici[\\/]/,
      use: 'null-loader',
    });
    return config;
  },
};

module.exports = nextConfig;
