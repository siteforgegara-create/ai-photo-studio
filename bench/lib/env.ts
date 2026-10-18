import { existsSync, readFileSync } from "node:fs";
import { ENV_FILE } from "./paths";

/**
 * Loads FAL_KEY from .env.local in the project root. The value is never
 * printed or logged — only whether it is present. Dry-runs never call this.
 */
export function getFalKey(): string {
  if (!process.env.FAL_KEY && existsSync(ENV_FILE)) {
    const loader = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile;
    if (typeof loader === "function") {
      loader(ENV_FILE);
    } else {
      // Node < 20.12: minimal KEY=VALUE parser for this one variable.
      const line = readFileSync(ENV_FILE, "utf8")
        .split(/\r?\n/)
        .find((l) => /^\s*FAL_KEY\s*=/.test(l));
      if (line) process.env.FAL_KEY = line.replace(/^\s*FAL_KEY\s*=\s*/, "").replace(/^["']|["']$/g, "").trim();
    }
  }
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    throw new Error("FAL_KEY not found. Add a line FAL_KEY=... to .env.local in the project root (C:\\Projects\\AI-Studio_claude\\.env.local). Dry-run works without it.");
  }
  return key;
}

/** Removes anything that looks like the key from text before it is printed or saved. */
export function redact(text: string): string {
  const key = process.env.FAL_KEY;
  let out = key ? text.split(key).join("[FAL_KEY]") : text;
  out = out.replace(/(Authorization["']?\s*[:=]\s*["']?Key\s+)[^"'\s,}]+/gi, "$1[redacted]");
  return out;
}
