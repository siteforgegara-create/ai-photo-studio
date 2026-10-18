/**
 * Safety margin per call, derived from its plan / ledger key — so every entry
 * in spend.json (also the ones written before margins existed) gets the
 * margin of its model. Keys:
 *   synth-01/reference, synth-01/selfie-3        personas (Qwen)
 *   real-01/analyze/selfie-1.jpg                  analysis (vision)
 *   real-01/<model>/<style>-<n>                   frames (nb21-noattr → nb21)
 *   real-01/lora/train, real-01/lora/<style>-<n>  LoRA
 *   upscale/…                                     upscale
 * Demo items carry their margin explicitly (the key does not name the model).
 */
import { ABLATION, ANALYZE, DEFAULT_MARGIN, LORA, MODELS, PERSONAS, UPSCALE } from "../config";

export function marginForKey(key: string): number {
  const parts = key.split("/");
  if (parts[0] === "upscale") return UPSCALE.marginFactor;
  if (parts.length === 2 && parts[1] === "reference") return PERSONAS.referenceMargin;
  if (parts.length === 2 && /^selfie-\d+$/.test(parts[1]!)) return PERSONAS.selfieMargin;
  const kind = parts[1];
  if (kind === "analyze") return ANALYZE.marginFactor;
  if (kind === "lora") return parts[2] === "train" ? LORA.trainMargin : LORA.generateMargin;
  if (kind === ABLATION.key) return MODELS[ABLATION.baseModel].marginFactor;
  const model = kind ? (MODELS as Record<string, { marginFactor: number }>)[kind] : undefined;
  return model?.marginFactor ?? DEFAULT_MARGIN;
}
