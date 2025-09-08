/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed output: 'export' to support Node.js deployment with dynamic features
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
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'lucide-react'],
  },
};

export default nextConfig;
