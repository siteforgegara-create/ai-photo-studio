import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { redact } from "./env";

/** One line per fal call (docs/07 §4): model, subject, style, time, cost, request id, response — never the key. */
export type CallLog = {
  at: string;
  key: string;
  kind: "frame" | "persona" | "lora-train" | "upscale" | "demo" | "analyze";
  subject?: string;
  model?: string;
  style?: string;
  n?: number;
  /** Hash of everything that shapes the frame (endpoint, prompt, seed): a cached frame with another hash is regenerated. */
  promptHash?: string;
  /** Frame reused from an earlier call with the identical request (e.g. smoke-test frames in the ablation group). */
  adoptedFrom?: string;
  endpoint: string;
  requestId?: string;
  ms?: number;
  usd: number;
  status: "ok" | "failed-charged" | "failed-free" | "skipped-ceiling";
  output?: { file?: string; url?: string; width?: number; height?: number; actualUsd?: number };
  response?: unknown;
  error?: string;
};

export function appendLog(file: string, entry: CallLog) {
  mkdirSync(path.dirname(file), { recursive: true });
  appendFileSync(file, redact(JSON.stringify(entry)) + "\n");
}

export function readLog(file: string): CallLog[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l) as CallLog);
}
