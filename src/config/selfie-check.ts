/**
 * Browser-side selfie quality thresholds — decision P1, docs/06-shoot-flow.md §1.
 * The checker itself (MediaPipe face detector, Laplacian sharpness, brightness,
 * dHash) is built in Stage 2 under src/features/selfie-check/. These starting
 * values will be calibrated there on synthetic + real samples.
 */
export const selfieCheckConfig = {
  minSelfies: 4,
  maxSelfies: 8,
  maxFileBytes: 15 * 1024 * 1024,
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const,
  acceptedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"] as const,
  /** Longest side after client-side resize (EXIF is stripped at the same time). */
  maxDimensionPx: 4096,

  face: {
    /** Exactly one face is required; 0 or 2+ → reject. */
    requiredFaces: 1,
    /** Face bbox area / image area. Below → warn `Face is small — crop closer`. */
    minFaceRatio: 0.06,
    /** Detector confidence for counting a face. */
    minDetectionConfidence: 0.6,
  },
  /** Variance of Laplacian on the face region (normalised to 256 px). Below → warn `Slightly blurry`. */
  sharpness: { warnBelow: 40 },
  /** Face region is analysed at this size (px, longest side) for speed and comparable metrics. */
  analysisSize: 256,
  /** Mean luminance (0–255) of the face region. */
  brightness: { warnBelow: 70, warnAbove: 230 },
  /** dHash Hamming distance (64-bit). At or below → warn `Very similar to another photo`. */
  duplicate: { maxHammingDistance: 6 },
} as const;

export type SelfieReason =
  | "no-face"
  | "multiple-faces"
  | "small-face"
  | "blurry"
  | "too-dark"
  | "too-bright"
  | "duplicate";

/** UI copy for each reason (06-shoot-flow.md §1). */
export const selfieReasonCopy: Record<SelfieReason, string> = {
  "no-face": "No face found",
  "multiple-faces": "More than one person",
  "small-face": "Face is small — crop closer",
  blurry: "Slightly blurry",
  "too-dark": "Too dark",
  "too-bright": "Too bright — avoid direct sunlight or flash",
  duplicate: "Very similar to another photo",
};

/** ✕ reasons exclude a selfie; ⚠ reasons keep it. */
export const rejectReasons: readonly SelfieReason[] = ["no-face", "multiple-faces"];

export const SELFIE_OK_COPY = "Looks great";
