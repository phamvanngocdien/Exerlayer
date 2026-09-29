import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      "@heroicons/react",
      "lucide-react",
      "date-fns",
      "viem",
    ],
  },
};

export default nextConfig;
