import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Ensure markdown/content parsing works smoothly
  serverExternalPackages: ['gray-matter'],
};

export default nextConfig;
