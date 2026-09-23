import type { NextConfig } from "next";
import path from "path";

// Vercel production Root Directory is `frontend`. Pin the same root locally so a
// parent lockfile (e.g. $HOME/package-lock.json) cannot steal Turbopack's workspace
// and break next/font/google during `npm run build`.
const frontendRoot = path.join(__dirname);

const nextConfig: NextConfig = {
  outputFileTracingRoot: frontendRoot,
  turbopack: {
    root: frontendRoot,
  },
  headers: async () => [
    {
      source: "/admin/:path*",
      headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }],
    },
    {
      source: "/admin",
      headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }],
    },
    {
      source: "/editor/:path*",
      headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }],
    },
    {
      source: "/editor",
      headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }],
    },
  ],
  images: {
    remotePatterns: [
      // Cloudflare R2 (various patterns)
      // Virtual-hosted style signed URL: <bucket>.<account>.r2.cloudflarestorage.com
      // ⇒ хоёр subdomain байдаг тул `**` хэрэгтэй
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "**.r2.dev",
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
      // Placeholder images
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
    ],
  },
};

export default nextConfig;
