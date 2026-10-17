"use client";

import * as React from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

const TABLET = "(min-width: 768px)";
const DESKTOP = "(min-width: 1200px)";

function read(): Breakpoint {
  if (window.matchMedia(DESKTOP).matches) return "desktop";
  if (window.matchMedia(TABLET).matches) return "tablet";
  return "mobile";
}

function subscribe(cb: () => void) {
  const a = window.matchMedia(TABLET);
  const b = window.matchMedia(DESKTOP);
  a.addEventListener("change", cb);
  b.addEventListener("change", cb);
  return () => {
    a.removeEventListener("change", cb);
    b.removeEventListener("change", cb);
  };
}

/** Breakpoints from 01-design-system §6 (mobile < 768 ≤ tablet < 1200 ≤ desktop). `null` before hydration. */
export function useBreakpoint(): Breakpoint | null {
  return React.useSyncExternalStore(subscribe, read, () => null);
}
