"use client";

/**
 * MediaPipe Tasks Face Detector (Apache-2.0), loaded lazily with a dynamic
 * import so it never lands in the initial bundle. WASM runtime and model are
 * served from our own origin (public/vendor, public/models) — images never
 * leave the browser.
 */
import type { FaceDetector } from "@mediapipe/tasks-vision";
import { selfieCheckConfig } from "@/config/selfie-check";
import type { Rect } from "./image-math";

export const MEDIAPIPE_WASM_PATH = "/vendor/mediapipe/wasm";
export const FACE_MODEL_PATH = "/models/face_detector_short_range.tflite";

export type DetectedFace = Rect & { score: number };

let detectorPromise: Promise<FaceDetector> | null = null;

async function createDetector(): Promise<FaceDetector> {
  const { FilesetResolver, FaceDetector } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
  const options = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: FACE_MODEL_PATH, delegate },
    runningMode: "IMAGE" as const,
    minDetectionConfidence: selfieCheckConfig.face.minDetectionConfidence,
  });
  try {
    return await FaceDetector.createFromOptions(fileset, options("GPU"));
  } catch {
    return await FaceDetector.createFromOptions(fileset, options("CPU"));
  }
}

export function getFaceDetector(): Promise<FaceDetector> {
  if (!detectorPromise) {
    detectorPromise = createDetector().catch((err) => {
      detectorPromise = null; // allow a retry
      throw err;
    });
  }
  return detectorPromise;
}

/** Starts downloading the model in the background (e.g. when the wizard opens). */
export function preloadFaceDetector() {
  void getFaceDetector().catch(() => undefined);
}

export async function detectFaces(source: HTMLCanvasElement | HTMLImageElement | ImageBitmap): Promise<DetectedFace[]> {
  const detector = await getFaceDetector();
  const result = detector.detect(source as HTMLCanvasElement);
  return result.detections
    .filter((d) => d.boundingBox)
    .map((d) => ({
      x: d.boundingBox!.originX,
      y: d.boundingBox!.originY,
      width: d.boundingBox!.width,
      height: d.boundingBox!.height,
      score: d.categories[0]?.score ?? 0,
    }))
    .sort((a, b) => b.width * b.height - a.width * a.height);
}
