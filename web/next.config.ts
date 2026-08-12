import type { NextConfig } from "next";

interface S3RemotePattern {
  protocol: "http" | "https";
  hostname: string;
  port: string;
  pathname: string;
}

function s3RemotePattern(): S3RemotePattern | null {
  const endpoint = process.env.S3_ENDPOINT ?? "http://127.0.0.1:9000";
  try {
    const url = new URL(endpoint);
    if (!url.hostname || !["http:", "https:"].includes(url.protocol)) {
      return null;
    }
    return {
      protocol: url.protocol.slice(0, -1) as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname: "/**",
    };
  } catch {
    return null;
  }
};

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
        port: "9000",
        pathname: "/s2/**",
      },
      s3RemotePattern(),
    ].filter((pattern): pattern is S3RemotePattern => pattern !== null),
    qualities: [100, 75],
  },
};

export default nextConfig;
