/**
 * Per-model request builders and per-call cost, so plan and execution use
 * exactly the same numbers.
 */
import { BASE_SEED, LORA, MODELS, OUTPUT, type BenchModel, type ModelKey } from "../config";
import { callCost, type Size } from "./cost";

/** Seedream 4.5 cannot go below ~3.7 MP; 4:5 at 1728×2160 (3.73 MP). */
export const SEEDREAM_SIZE: Size = { width: 1728, height: 2160 };

/** Upload size we assume for planning when the real selfie is not yet on disk (≤ 1 MP after normalisation). */
export const PLANNED_SELFIE_SIZE: Size = { width: 864, height: 1152 };

export function outputSize(model: BenchModel): Size {
  return model.key === "seedream" ? SEEDREAM_SIZE : OUTPUT;
}

/** References actually sent: up to the model's limit and at most 8 selfies. */
export function refsFor(model: BenchModel, selfieCount: number): number {
  return Math.min(model.maxRefs, selfieCount, 8);
}

export function frameCost(model: BenchModel, refSizes: Size[]): number {
  return callCost(model.pricing, { output: outputSize(model), inputs: refSizes.slice(0, refsFor(model, refSizes.length)) });
}

export function loraTrainCost(): number {
  return callCost(LORA.trainPricing, { steps: LORA.steps });
}

export function loraFrameCost(): number {
  return callCost(LORA.generatePricing, { output: OUTPUT });
}

export function seedFor(styleIndex: number, n: number): number {
  return BASE_SEED + styleIndex * 100 + n;
}

/** Request body for one frame (num_images = 1, fixed seed). */
export function buildFrameInput(model: BenchModel, prompt: string, refUrls: string[], seed: number): Record<string, unknown> {
  const refs = refUrls.slice(0, refsFor(model, refUrls.length));
  switch (model.key as Exclude<ModelKey, "lora">) {
    case "nb2":
    case "nbpro":
      return { prompt, image_urls: refs, num_images: 1, seed, aspect_ratio: "4:5", resolution: "1K", output_format: "jpeg" };
    case "seedream":
      return { prompt, image_urls: refs, image_size: SEEDREAM_SIZE, num_images: 1, max_images: 1, seed };
    case "flux2":
      return { prompt, image_urls: refs, image_size: OUTPUT, seed, output_format: "jpeg" };
  }
}

export function buildLoraFrameInput(prompt: string, loraUrl: string, seed: number): Record<string, unknown> {
  return { prompt, loras: [{ path: loraUrl, scale: 1 }], image_size: OUTPUT, num_images: 1, seed, output_format: "jpeg" };
}

/** Response shapes we read (images[0].url for every generator). */
export type ImagesResponse = { images: { url: string; width?: number; height?: number }[]; seed?: number };
export type LoraTrainResponse = { diffusers_lora_file: { url: string }; config_file?: { url: string } };
export type UpscaleResponse = { image: { url: string; width?: number; height?: number } };

export function getModel(key: string): BenchModel {
  const m = MODELS[key as keyof typeof MODELS];
  if (!m) throw new Error(`Unknown model "${key}". Use one of: ${Object.keys(MODELS).join(", ")}`);
  return m;
}
