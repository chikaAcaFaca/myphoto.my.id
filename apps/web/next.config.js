/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
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
  serverExternalPackages: ['undici', '@ffmpeg-installer/ffmpeg'],
  // The ffmpeg binary is picked at runtime by platform, so tracing can't see
  // it: ship the Linux one with the routes that convert meme videos.
  outputFileTracingIncludes: {
    '/api/meme-wall': [
      './node_modules/@ffmpeg-installer/linux-x64/**',
      '../../node_modules/@ffmpeg-installer/linux-x64/**',
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config, { isServer }) => {
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
