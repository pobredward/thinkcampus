import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 에뮬레이터용 빌드(npm run build:emu)는 .next-emu 에 따로 만들어 실서비스 빌드와 섞이지 않게 한다
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  // 학부모 전용 서비스 — 검색엔진 색인 불필요
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
