import { rejectReasons, selfieCheckConfig, selfieReasonCopy, type SelfieReason } from "@/config/selfie-check";
import type { SelfieCheck } from "@/services/types";
import { hammingDistance } from "./image-math";

export type SelfieMetrics = {
  faces: number;
  /** Largest face bbox area / image area (0–1). */
  faceRatio: number;
  sharpness: number;
  brightness: number;
  /** localId of an earlier selfie that looks almost the same. */
  duplicateOf?: string;
};

/** Turns raw metrics into ✓ / ⚠ / ✕ with reasons (decision P1, config thresholds). */
export function evaluateSelfie(m: SelfieMetrics, cfg = selfieCheckConfig): SelfieCheck & { reasonCodes: SelfieReason[] } {
  const codes: SelfieReason[] = [];
  if (m.faces === 0) codes.push("no-face");
  else if (m.faces > cfg.face.requiredFaces) codes.push("multiple-faces");
  else {
    if (m.faceRatio < cfg.face.minFaceRatio) codes.push("small-face");
    if (m.sharpness < cfg.sharpness.warnBelow) codes.push("blurry");
    if (m.brightness < cfg.brightness.warnBelow) codes.push("too-dark");
    else if (m.brightness > cfg.brightness.warnAbove) codes.push("too-bright");
    if (m.duplicateOf) codes.push("duplicate");
  }
  const verdict: SelfieCheck["verdict"] = codes.some((c) => rejectReasons.includes(c)) ? "reject" : codes.length ? "warn" : "ok";
  return {
    faces: m.faces,
    faceRatio: m.faceRatio,
    sharpness: m.sharpness,
    brightness: m.brightness,
    ...(m.duplicateOf ? { duplicateOf: m.duplicateOf } : {}),
    verdict,
    reasons: codes.map((c) => selfieReasonCopy[c]),
    reasonCodes: codes,
  };
}

export type SetSummary = { usable: number; required: number; missing: number; quality: "good" | "needs-more" };

/** `3 of 4 required` + `Good set` / `Add 1 more photo`. ⚠ counts, ✕ does not. */
export function summarizeSet(verdicts: SelfieCheck["verdict"][], cfg = selfieCheckConfig): SetSummary {
  const usable = verdicts.filter((v) => v === "ok" || v === "warn").length;
  const missing = Math.max(0, cfg.minSelfies - usable);
  return { usable, required: cfg.minSelfies, missing, quality: missing === 0 ? "good" : "needs-more" };
}

export function findDuplicate(hash: string, others: { localId: string; hash: string }[], cfg = selfieCheckConfig): string | undefined {
  return others.find((o) => hammingDistance(hash, o.hash) <= cfg.duplicate.maxHammingDistance)?.localId;
}
