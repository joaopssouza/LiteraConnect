import type {NextConfig} from 'next';

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
    'http://192.168.205.249:3000',
  ],
  // Allow access to remote image providers used by the app.
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment' as const,
    remotePatterns: [
      {
        // Supabase Storage self-hosted (exposto via Nginx Proxy Manager)
        // Configure NEXT_PUBLIC_SUPABASE_STORAGE_HOSTNAME no .env com o seu domínio
        // Ex: files.literaconnect.com.br ou o IP do servidor para dev local
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_HOSTNAME ?? '**.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // Supabase Studio / Kong local (desenvolvimento sem HTTPS)
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
