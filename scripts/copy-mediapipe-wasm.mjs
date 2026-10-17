// Copies the MediaPipe Tasks Vision WASM runtime into public/vendor so it is
// served from our own origin (no third-party CDN at runtime). Runs on postinstall.
// The files are large (~13 MB each) and are git-ignored.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const dest = join(root, "public", "vendor", "mediapipe", "wasm");

if (!existsSync(src)) {
  console.warn("[copy-mediapipe-wasm] @mediapipe/tasks-vision not installed, skipping");
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
for (const file of ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"]) {
  cpSync(join(src, file), join(dest, file));
}
console.log("[copy-mediapipe-wasm] copied to public/vendor/mediapipe/wasm");
