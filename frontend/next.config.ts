import type { NextConfig } from "next";
import path from "path";

const sharedPath = path.resolve(__dirname, "../shared");

const nextConfig: NextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "5000",
        pathname: "/uploads/**",
      },
    ],
  },
  // Alias for both Turbopack (default dev) and webpack (build / --webpack flag)
  turbopack: {
    resolveAlias: {
      "@shared": sharedPath,
    },
  },
  webpack(config) {
    config.resolve.alias["@shared"] = sharedPath;
    return config;
  },
};

export default nextConfig;
