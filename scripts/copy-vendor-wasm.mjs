// Copies browser WASM runtimes into public/vendor so they are served from our
// own origin (no third-party CDN at runtime). Runs on postinstall.
// The files are large and git-ignored.
//  - MediaPipe Tasks Vision (face detector, selfie check)      → /vendor/mediapipe/wasm/
//  - ONNX Runtime Web, WASM backend (background remover model) → /vendor/ort/
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const jobs = [
  {
    name: "@mediapipe/tasks-vision",
    src: join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm"),
    dest: join(root, "public", "vendor", "mediapipe", "wasm"),
    files: ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"],
  },
  {
    name: "onnxruntime-web",
    src: join(root, "node_modules", "onnxruntime-web", "dist"),
    dest: join(root, "public", "vendor", "ort"),
    files: ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"],
  },
];

for (const job of jobs) {
  if (!existsSync(job.src)) {
    console.warn(`[copy-vendor-wasm] ${job.name} not installed, skipping`);
    continue;
  }
  mkdirSync(job.dest, { recursive: true });
  for (const file of job.files) cpSync(join(job.src, file), join(job.dest, file));
  console.log(`[copy-vendor-wasm] ${job.name} → ${job.dest.replace(root, "")}`);
}
