import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "/s2/**",
      },
    ],
    qualities: [100, 75],
  },
};

export default nextConfig;
