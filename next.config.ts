import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  images: {
    unoptimized: true,
  },
  cacheHandler:
    process.env.USE_CUSTOM_CACHE === "true"
      ? require.resolve("./lib/cache-handler.mjs")
      : undefined,
};

export default nextConfig;
