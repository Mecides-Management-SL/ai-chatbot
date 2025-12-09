import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        hostname: "5c93kavoeegeyqnz.public.blob.vercel-storage.com",
      },
    ],
  },
  // Empty turbopack config to acknowledge the default Turbopack behavior
  // Turbopack automatically excludes Node.js built-ins (fs, net, tls) from client bundles
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Exclude Puppeteer from client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
};

export default nextConfig;
