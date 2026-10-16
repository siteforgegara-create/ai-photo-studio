/**
 * Dev-only tooling (dev panel, /dev/ui). Enabled in `next dev`, or in a
 * production build when NEXT_PUBLIC_ENABLE_DEV_TOOLS=1 (used by the
 * screenshot run so /dev/ui can be captured from a production build).
 */
export const devToolsEnabled =
  process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === "1";
