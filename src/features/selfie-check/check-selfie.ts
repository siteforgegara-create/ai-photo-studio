"use client";

import { selfieCheckConfig } from "@/config/selfie-check";
import { detectFaces } from "./face-detector";
import { dHash, expandRect, laplacianVariance, meanBrightness, toGray } from "./image-math";
import { evaluateSelfie, findDuplicate } from "./evaluate";
import { prepareImage, regionToImageData } from "./prepare";

export type CheckedSelfie = {
  blob: Blob;
  width: number;
  height: number;
  hash: string;
  check: ReturnType<typeof evaluateSelfie>;
};

/**
 * Full browser-side check of one selfie (P1): decode + strip EXIF, detect
 * faces, then sharpness / brightness on the face region and dHash on the whole
 * frame. Nothing is uploaded.
 */
export async function checkSelfie(file: File, previous: { localId: string; hash: string }[]): Promise<CheckedSelfie> {
  const img = await prepareImage(file);
  const faces = await detectFaces(img.canvas);
  const size = selfieCheckConfig.analysisSize;

  const hash = dHash(toGray(regionToImageData(img.canvas, { x: 0, y: 0, width: img.width, height: img.height }, 64)));
  const duplicateOf = findDuplicate(hash, previous);

  const main = faces[0];
  let sharpness = 0;
  let brightness = 0;
  let faceRatio = 0;
  if (main) {
    const region = expandRect(main, img.width, img.height, 1.1);
    const gray = toGray(regionToImageData(img.canvas, region, size));
    sharpness = laplacianVariance(gray);
    brightness = meanBrightness(gray);
    faceRatio = (main.width * main.height) / (img.width * img.height);
  }

  const check = evaluateSelfie({ faces: faces.length, faceRatio, sharpness, brightness, duplicateOf });
  return { blob: img.blob, width: img.width, height: img.height, hash, check };
}
