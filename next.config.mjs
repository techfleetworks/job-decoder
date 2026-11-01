/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Linting runs as its own CI step on Node 20 (see .github/workflows/ci.yml).
  // Keeping it out of `next build` lets the build pass on newer local Node too.
  eslint: { ignoreDuringBuilds: true },
  // Baseline security headers (ADR-0009). A strict Content-Security-Policy is
  // added with the decode route and the real screens (ticket T13).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
