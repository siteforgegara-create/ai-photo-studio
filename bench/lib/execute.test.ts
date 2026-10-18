// @vitest-environment node
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const callFal = vi.fn();
vi.mock("./fal", () => ({ callFal: (...a: unknown[]) => callFal(...a) }));

const { execute } = await import("./execute");
const { Spend, loadLedger } = await import("./ledger");

function tmp() {
  const dir = mkdtempSync(path.join(tmpdir(), "bench-"));
  return { spendFile: path.join(dir, "spend.json"), logFile: path.join(dir, "log.jsonl") };
}

const job = (key: string, costUsd: number) => ({ key, kind: "frame" as const, endpoint: "fal-ai/x", input: {}, costUsd, save: async () => ({ file: `${key}.jpg` }) });

describe("Spend (ceiling guard)", () => {
  it("parallel reservations never exceed the ceiling", async () => {
    const { spendFile } = tmp();
    const spend = new Spend(spendFile, 17);
    const results = await Promise.all(Array.from({ length: 10 }, () => spend.reserve(2, 1.1)));
    expect(results.filter(Boolean)).toHaveLength(7); // ×1.1 → $2.20 each: 7 × 2.2 = $15.40; the 8th would make $17.60
  });

  it("persists settled spend across processes (spend.json)", async () => {
    const { spendFile } = tmp();
    const a = new Spend(spendFile, 17);
    await a.reserve(3, 1.2);
    await a.settle({ key: "k", usd: 3, status: "ok", margin: 1.2 }, 3.6);
    const b = new Spend(spendFile, 17);
    expect(b.spent).toBe(3);
    expect(b.effective).toBe(3.6); // counted × its margin
    expect(await b.reserve(13.4)).toBe(true); // 3.6 + 13.4 = 17.0
    expect(await b.reserve(0.01)).toBe(false);
  });
});

describe("execute", () => {
  beforeEach(() => callFal.mockReset());

  it("ok → saved, charged once, logged with request id", async () => {
    const { spendFile, logFile } = tmp();
    callFal.mockResolvedValue({ ok: true, data: { images: [{ url: "u" }] }, requestId: "req-1", ms: 1200 });
    const spend = new Spend(spendFile, 17);
    expect(await execute(job("s/nb2/a-1", 0.08), spend, logFile)).toBe("ok");
    expect(callFal).toHaveBeenCalledTimes(1);
    expect(loadLedger(spendFile).spentUsd).toBe(0.08);
    const line = JSON.parse(readFileSync(logFile, "utf8").trim());
    expect(line).toMatchObject({ key: "s/nb2/a-1", requestId: "req-1", usd: 0.08, status: "ok", output: { file: "s/nb2/a-1.jpg" } });
  });

  it("a call that would cross the ceiling is never made", async () => {
    const { spendFile, logFile } = tmp();
    const spend = new Spend(spendFile, 0.1);
    callFal.mockResolvedValue({ ok: true, data: {}, requestId: "r", ms: 1 });
    // Keys without a known model get DEFAULT_MARGIN (1.2).
    expect(await execute(job("a", 0.09), spend, logFile)).toBe("skipped"); // 0.108 with margin
    expect(await execute(job("b", 0.08), spend, logFile)).toBe("ok"); // fits: 0.096 ≤ 0.10
    expect(await execute(job("c", 0.08), spend, logFile)).toBe("skipped"); // 0.192 would cross
    expect(callFal).toHaveBeenCalledTimes(1);
    expect(readFileSync(logFile, "utf8")).toContain('"status":"skipped-ceiling"');
  });

  it("rejected-at-submit failures are free; accepted-then-failed are counted", async () => {
    const { spendFile, logFile } = tmp();
    const spend = new Spend(spendFile, 17);
    callFal.mockResolvedValueOnce({ ok: false, error: "422 invalid", ms: 10, charged: false });
    expect(await execute(job("a", 0.15), spend, logFile)).toBe("failed");
    expect(spend.spent).toBe(0);
    callFal.mockResolvedValueOnce({ ok: false, error: "500 model error", requestId: "r2", ms: 10, charged: true });
    expect(await execute(job("b", 0.15), spend, logFile)).toBe("failed");
    expect(spend.spent).toBe(0.15);
  });

  it("never writes the key into the log", async () => {
    const { spendFile, logFile } = tmp();
    process.env.FAL_KEY = "secret-key-123";
    callFal.mockResolvedValue({ ok: false, error: "auth failed for secret-key-123", ms: 5, charged: false });
    await execute(job("a", 0.08), new Spend(spendFile, 17), logFile);
    expect(readFileSync(logFile, "utf8")).not.toContain("secret-key-123");
    delete process.env.FAL_KEY;
  });
});
