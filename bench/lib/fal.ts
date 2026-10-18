import { createFalClient, ApiError, ValidationError, type FalClient } from "@fal-ai/client";
import { FAL_OBJECT_EXPIRY, MAX_RETRIES } from "../config";
import { getFalKey, redact } from "./env";

let client: FalClient | null = null;

/** Lazily created — dry-runs never touch the key or the network. */
export function fal(): FalClient {
  client ??= createFalClient({ credentials: getFalKey() });
  return client;
}

/** Headers for every request: outputs expire on fal's CDN, and request history keeps no inputs/outputs. */
const HEADERS = { "X-Fal-Store-IO": "0" };

/** Uploads a file to fal storage; it expires after FAL_OBJECT_EXPIRY. */
export async function upload(buffer: Buffer, contentType: string, name: string): Promise<string> {
  const blob = new Blob([new Uint8Array(buffer)], { type: contentType });
  const file = new File([blob], name, { type: contentType });
  return withRetries(() => fal().storage.upload(file, { lifecycle: { expiresIn: FAL_OBJECT_EXPIRY } }), "upload");
}

export type CallOutcome<T> =
  | { ok: true; data: T; requestId: string; ms: number }
  /** `charged`: false only when fal certainly did not accept the job (validation error, nothing submitted). */
  | { ok: false; error: string; requestId?: string; ms: number; charged: boolean };

/**
 * Submit once, then poll by request id. Network errors before the job is
 * accepted are retried (nothing is billed yet); after acceptance only the
 * status/result polling is retried, with the same request id — a successful
 * job is never submitted twice.
 */
export async function callFal<T>(endpoint: string, input: Record<string, unknown>, onAccepted?: (requestId: string) => void): Promise<CallOutcome<T>> {
  const started = Date.now();
  let requestId: string | undefined;
  try {
    const submitted = await withRetries(
      () =>
        fal().queue.submit(endpoint, {
          input,
          headers: HEADERS,
          storageSettings: { expiresIn: FAL_OBJECT_EXPIRY },
        } as Parameters<FalClient["queue"]["submit"]>[1]),
      `submit ${endpoint}`,
    );
    requestId = submitted.request_id;
    onAccepted?.(requestId);
    await withRetries(() => fal().queue.subscribeToStatus(endpoint, { requestId: requestId!, mode: "polling", pollInterval: 2000 }), `status ${requestId}`);
    const result = await withRetries(() => fal().queue.result(endpoint, { requestId: requestId! }), `result ${requestId}`);
    return { ok: true, data: result.data as T, requestId, ms: Date.now() - started };
  } catch (e) {
    const message = describeError(e);
    // Rejected at submit with a 4xx (bad input): never accepted, never billed.
    const charged = !(requestId === undefined && (e instanceof ValidationError || (e instanceof ApiError && e.status < 500)));
    return { ok: false, error: message, requestId, ms: Date.now() - started, charged };
  }
}

function describeError(e: unknown): string {
  if (e instanceof ApiError) return redact(`${e.status} ${e.message} ${JSON.stringify(e.body ?? "")}`.slice(0, 800));
  return redact(e instanceof Error ? e.message : String(e));
}

/** Retries network-type failures up to MAX_RETRIES times with backoff. */
async function withRetries<T>(fn: () => Promise<T>, what: string, retryable: (e: unknown) => boolean = isNetworkError): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= MAX_RETRIES || !retryable(e)) throw e;
      attempt += 1;
      const wait = 1500 * attempt;
      console.warn(`  ↻ ${what}: ${describeError(e)} — retry ${attempt}/${MAX_RETRIES} in ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

function isNetworkError(e: unknown): boolean {
  if (e instanceof ApiError) return e.status >= 500 || e.status === 429;
  return e instanceof TypeError || (e instanceof Error && /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket|network/i.test(e.message));
}
