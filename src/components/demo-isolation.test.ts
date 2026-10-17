import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * CLAUDE.md §3.4 / §5: demo code must not import EditsService or ShootsService,
 * so demo mode structurally cannot reach generation.
 */
describe("demo isolation", () => {
  const files = ["src/config/demo-manifest.ts", "src/components/before-after/before-after.tsx", "src/features/studio/demo.ts", "src/features/home/hero-demo.tsx", "src/features/home/edits-demo.tsx"];
  it.each(files)("%s does not import generation services", (file) => {
    const src = readFileSync(path.resolve(file), "utf8");
    expect(src).not.toMatch(/editsService|shootsService|services\/edits|services\/shoots|@\/services["']/);
  });
});
