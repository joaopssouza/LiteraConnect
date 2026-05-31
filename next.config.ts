import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Explicitly allow local network origins during development to avoid
  // cross-origin warnings when opening the app from another device.
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://192.168.100.7:3000',
    'http://192.168.100.7:3000',
    'https://literaconnect.vercel.app',
    'https://literaconnect.jpdev.uk',
    'http://10.195.12.51:3000',
  ],
  // Allow access to remote image providers used by the app.
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment' as const,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'literaconnect.jpdev.uk',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/auth/v1/:path*',
        destination: 'http://supabase_kong:8000/auth/v1/:path*',
      },
      {
        source: '/rest/v1/:path*',
        destination: 'http://supabase_kong:8000/rest/v1/:path*',
      },
      {
        source: '/storage/v1/:path*',
        destination: 'http://supabase_kong:8000/storage/v1/:path*',
      },
      {
        source: '/realtime/v1/:path*',
        destination: 'http://supabase_kong:8000/realtime/v1/:path*',
      },
    ];
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config: any, { dev }: { dev: boolean }) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
