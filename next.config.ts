import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  poweredByHeader: false,
  async headers() {
    // Baseline security headers. A full Content-Security-Policy is a launch task (reports/stage-5.md):
    // it must allow 'wasm-unsafe-eval' and blob: workers for MediaPipe / ONNX Runtime, and the
    // Lemon Squeezy, PostHog and Sentry origins chosen in the backend stages.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // CLAUDE.md §6: credits live on the pricing page.
      { source: "/credits", destination: "/pricing#credits", permanent: false },
    ];
  },
};

export default nextConfig;
