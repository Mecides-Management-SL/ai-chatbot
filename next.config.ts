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
};

export default nextConfig;
