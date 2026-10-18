import { formatUsd } from "./cost";
import { callFal } from "./fal";
import type { Spend } from "./ledger";
import { appendLog, type CallLog } from "./log";

export type Job<T> = {
  key: string;
  kind: CallLog["kind"];
  endpoint: string;
  input: Record<string, unknown>;
  costUsd: number;
  meta?: Pick<CallLog, "subject" | "model" | "style" | "n" | "promptHash">;
  /** Saves the result (download etc.) and returns what goes into the log. */
  save: (data: T) => Promise<CallLog["output"]>;
};

export type JobResult = "ok" | "failed" | "skipped";

/**
 * One paid call: reserve against the ceiling → call → save → settle the
 * ledger → log. A call that would cross the ceiling is not made.
 */
export async function execute<T>(job: Job<T>, spend: Spend, logFile: string): Promise<JobResult> {
  const base = { at: new Date().toISOString(), key: job.key, kind: job.kind, endpoint: job.endpoint, ...job.meta };
  if (!(await spend.reserve(job.costUsd))) {
    appendLog(logFile, { ...base, usd: 0, status: "skipped-ceiling" });
    console.log(`  ⛔ ${job.key}: skipped — would cross the spending ceiling`);
    return "skipped";
  }
  const res = await callFal<T>(job.endpoint, job.input);
  if (res.ok) {
    let output: CallLog["output"];
    let error: string | undefined;
    try {
      output = await job.save(res.data);
    } catch (e) {
      error = `saving the result failed: ${e instanceof Error ? e.message : String(e)}`;
    }
    await spend.settle({ key: job.key, usd: job.costUsd, status: "ok", requestId: res.requestId }, job.costUsd);
    appendLog(logFile, { ...base, requestId: res.requestId, ms: res.ms, usd: job.costUsd, status: "ok", output, response: summarizeResponse(res.data), error });
    console.log(`  ${error ? "⚠" : "✓"} ${job.key}  ${(res.ms / 1000).toFixed(1)}s  ${formatUsd(job.costUsd)}${error ? `  ${error}` : ""}`);
    return error ? "failed" : "ok";
  }
  const status = res.charged ? "failed-charged" : "failed-free";
  await spend.settle({ key: job.key, usd: job.costUsd, status, requestId: res.requestId }, job.costUsd);
  appendLog(logFile, { ...base, requestId: res.requestId, ms: res.ms, usd: res.charged ? job.costUsd : 0, status, error: res.error });
  console.log(`  ✖ ${job.key}: ${res.error}${res.charged ? " (counted as spent)" : ""}`);
  return "failed";
}

/** Keeps the log small: drops data URIs, keeps urls, sizes, seeds and descriptions. */
function summarizeResponse(data: unknown): unknown {
  return JSON.parse(JSON.stringify(data ?? null, (_k, v) => (typeof v === "string" && v.startsWith("data:") ? `[data uri ${v.length} chars]` : v)));
}
