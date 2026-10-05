import type { NextConfig } from "next";

// PostHog 리전: "us"(기본) 또는 "eu"
const posthogRegion = process.env.NEXT_PUBLIC_POSTHOG_REGION === "eu" ? "eu" : "us";

const nextConfig: NextConfig = {
  // PostHog 이벤트를 같은 도메인의 /ingest로 받아 PostHog로 전달
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: `https://${posthogRegion}-assets.i.posthog.com/static/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `https://${posthogRegion}.i.posthog.com/:path*`,
      },
    ];
  },
  // PostHog API 경로의 끝 슬래시를 유지
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
