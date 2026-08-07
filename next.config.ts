import type { NextConfig } from "next";

const allowedDomains = process.env.ALLOWED_IMAGE_DOMAINS
  ? process.env.ALLOWED_IMAGE_DOMAINS.split(",")
      .map((d) => d.trim())
      .filter(Boolean)
  : [];

const remotePatterns = allowedDomains.map((domain) => {
  const isHttp = domain.startsWith("http://");
  const cleaned = domain.replace(/^https?:\/\//, "");
  return {
    protocol: (isHttp ? "http" : "https") as "http" | "https",
    hostname: cleaned,
  };
});

// Default wildcard pattern to support cloud object storage endpoints seamlessly
if (remotePatterns.length === 0) {
  remotePatterns.push(
    { protocol: "https", hostname: "**" },
    { protocol: "http", hostname: "**" },
  );
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  images: {
    unoptimized: true,
    remotePatterns,
  },
  cacheHandler:
    process.env.USE_CUSTOM_CACHE === "true"
      ? require.resolve("./lib/cache-handler.mjs")
      : undefined,
};

export default nextConfig;
