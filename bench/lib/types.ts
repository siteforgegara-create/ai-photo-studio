import type { Defect } from "./face";

/** Shared result shapes of bench:score, bench:review and bench:report. */
export type FrameScore = {
  file: string;
  subject: string;
  subjectType: "real" | "synth";
  model: string;
  style: string;
  n: number;
  faces: number;
  defect: Defect | null;
  similarity: number | null;
  ms?: number;
  usd?: number;
};

export type ScoresFile = {
  run: string;
  scoredAt: string;
  method: string;
  baseline: { genuine: number[]; impostor: number[] };
  subjects: { id: string; type: string; referenceFrom: string; selfiesWithFace: number; selfiesTotal: number }[];
  frames: FrameScore[];
};

/** One frame in the blind review — the model is hidden behind `id`. */
export type ReviewFrame = { id: string; src: string };
export type ReviewSubject = { id: string; type: "real" | "synth"; selfies: string[]; frames: ReviewFrame[] };
export type ReviewData = { run: string; createdAt: string; subjects: ReviewSubject[] };

/** review-key.json: frame id → what it really is (kept out of the HTML). */
export type ReviewKey = Record<string, { file: string; subject: string; model: string; style: string; n: number }>;

/** ratings.json downloaded from review.html. */
export type Rating = { similarity?: number; quality?: number; sellable?: boolean };
export type RatingsFile = { run: string; savedAt: string; rater?: string; ratings: Record<string, Rating> };
