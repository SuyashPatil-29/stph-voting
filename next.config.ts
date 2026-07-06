import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Photo uploads go through Server Actions; raise the default 1 MB cap.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
