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

type ServerActionBodySizeLimit = NonNullable<
  NonNullable<NextConfig["experimental"]>["serverActions"]
>["bodySizeLimit"];

const serverActionBodySizeLimit: ServerActionBodySizeLimit =
  (process.env.SERVER_ACTION_BODY_LIMIT as ServerActionBodySizeLimit | undefined) ?? "12mb";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Keep action payloads bounded to reduce abuse risk.
      bodySizeLimit: serverActionBodySizeLimit
    }
  }
};

export default withPWA(nextConfig);
