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
  async redirects() {
    return [
      // CLAUDE.md §6: credits live on the pricing page.
      { source: "/credits", destination: "/pricing#credits", permanent: false },
    ];
  },
};

export default nextConfig;
