import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Rewrites to proxy API calls during dev (avoids CORS issues)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
