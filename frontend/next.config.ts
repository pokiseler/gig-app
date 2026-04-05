import type { NextConfig } from "next";
import path from "path";

const sharedPath = path.resolve(__dirname, "../shared");

// Derive the backend upload hostname from the API URL env var so the same
// config works in local dev (localhost) and production (Render hostname).
const backendImagePattern = (): NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
  try {
    const url = new URL(apiUrl);
    return [
      {
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
        pathname: "/uploads/**",
      },
    ];
  } catch {
    return [];
  }
};

const nextConfig: NextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: backendImagePattern(),
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
