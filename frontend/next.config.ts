import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Configure API proxy to backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:8000/api/:path*',
      },
      {
        source: '/_synthetic/:path*',
        destination: 'http://backend:8000/_synthetic/:path*',
      },
    ]
  },
};

export default nextConfig;
