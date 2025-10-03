import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  experimental: {
    reactCompiler: false,
  },
};

export default nextConfig;
