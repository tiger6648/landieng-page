import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static은 실행 파일 경로를 __dirname으로 찾으므로 번들링하지 않는다
  serverExternalPackages: ["ffmpeg-static"],
};

export default nextConfig;
