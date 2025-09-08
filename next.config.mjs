/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurado para Node.js deployment - no static export
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable font optimization for faster builds
  optimizeFonts: false,
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
