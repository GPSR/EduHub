import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: "/offline"
  }
});

const serverActionBodySizeLimit = "1gb";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Allows larger gallery upload payloads for multi-file submits.
      bodySizeLimit: serverActionBodySizeLimit
    }
  }
};

export default withPWA(nextConfig);
