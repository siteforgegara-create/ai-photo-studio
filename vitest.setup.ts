import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  // bench/ tests run in the node environment (no window).
  if (typeof window !== "undefined") window.localStorage.clear();
});
