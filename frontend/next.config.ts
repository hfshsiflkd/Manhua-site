import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Cloudflare R2 (various patterns)
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "pub-*.r2.dev",
      },
      // Cloudinary (for existing images)
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      // Custom Cloudflare R2 domains
      {
        protocol: "https",
        hostname: "*.cloudflare.com",
      },
    ],
    // Also allow specific domains if needed
    domains: [
      "res.cloudinary.com",
      "via.placeholder.com", // for placeholder images
    ],
  },
};

export default nextConfig;
