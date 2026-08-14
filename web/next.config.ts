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

function s3UsesPrivateNetwork(): boolean {
  const endpoint = process.env.S3_ENDPOINT ?? "http://127.0.0.1:9000";
  try {
    const hostname = new URL(endpoint).hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "::1") return true;
    const octets = hostname.split(".").map(Number);
    if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return false;
    }
    return (
      octets[0] === 10 ||
      octets[0] === 127 ||
      (octets[0] === 169 && octets[1] === 254) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168)
    );
  } catch {
    return false;
  }
}

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowLocalIP: s3UsesPrivateNetwork(),
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
        port: "",
        pathname: "/s2/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media.licdn.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        port: "",
        pathname: "/**",
      },
      s3RemotePattern(),
    ].filter((pattern): pattern is S3RemotePattern => pattern !== null),
    qualities: [100, 75],
  },
};

export default nextConfig;
