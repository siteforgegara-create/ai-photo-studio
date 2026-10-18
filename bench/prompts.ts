/**
 * Prompts — identical for every model (docs/07 §4). Style ids come from
 * src/config/styles.ts; the bench compares `corporate-gray` and
 * `modern-office`, the demo step (§8) uses all twelve.
 */
import { shootStyles } from "../src/config/styles";

export const BASE_PROMPT =
  "Professional headshot photo of the same person as in the reference photos. Preserve their exact facial features, face shape, skin tone, eye color, hairline and age. Natural skin texture with visible pores. Head and shoulders, looking at the camera, relaxed confident expression, sharp focus on the eyes, shot on a full-frame camera with an 85mm lens.";

export const NEGATIVE_PROMPT =
  "No beautification, no face reshaping, no skin smoothing, no makeup changes, no extra people, no text, no watermark, no logos.";

/** Background, outfit and light per style (outfit: blazer for the bench styles, per docs/07 §4). */
export const STYLE_PROMPTS: Record<string, string> = {
  "corporate-gray": "Plain mid-gray seamless studio backdrop. Wearing a dark tailored blazer over a plain shirt. Soft, even key light with gentle fill, classic corporate portrait.",
  "studio-white": "Bright, even white seamless studio backdrop. Wearing a dark blazer over a light shirt. High-key soft studio lighting, clean shadows.",
  "studio-charcoal": "Deep charcoal studio backdrop. Wearing a dark blazer. Focused directional key light with subtle rim light, confident executive look.",
  "modern-office": "Softly blurred contemporary office in the background with glass and warm wood, shallow depth of field. Wearing a tailored blazer over a plain shirt. Natural window light from the side.",
  "glass-meeting-room": "Bright meeting room with glass walls, gently out of focus. Wearing a smart blazer. Diffused daylight.",
  "warm-library": "Warm wooden bookshelves softly out of focus behind. Wearing a blazer over a shirt. Warm, soft indoor light.",
  "city-bokeh": "Urban street at dusk with soft out-of-focus city lights (bokeh) behind. Wearing a smart jacket. Natural light balanced with warm street lights.",
  "outdoor-park": "Natural park greenery softly out of focus behind. Wearing a smart casual jacket. Open shade daylight, approachable feel.",
  "golden-hour": "Outdoors at golden hour, warm low sun behind creating a soft rim light, background softly blurred. Wearing a smart casual outfit.",
  "minimal-beige": "Warm neutral beige seamless backdrop. Wearing a light blazer over a simple top. Soft, calm studio light.",
  "tech-startup": "Relaxed modern workspace softly blurred behind, plants and light wood. Wearing a smart casual knit or overshirt. Bright natural light.",
  "creative-color": "Bold solid colored studio backdrop (deep teal). Wearing a modern dark outfit. Crisp studio light with a soft colored rim.",
};

export function stylePrompt(styleId: string): string {
  const style = shootStyles.find((s) => s.id === styleId);
  const block = STYLE_PROMPTS[styleId];
  if (!style || !block) throw new Error(`Unknown style: ${styleId}`);
  return block;
}

/** The full generation prompt for one style. `subjectToken` is used by the LoRA control instead of "reference photos". */
export function generationPrompt(styleId: string, subjectToken?: string): string {
  const base = subjectToken ? BASE_PROMPT.replace("the same person as in the reference photos", `${subjectToken}`) : BASE_PROMPT;
  return `${base} ${stylePrompt(styleId)} ${NEGATIVE_PROMPT}`;
}

// ─── Synthetic personas (docs/07 §2, step A) ────────────────────────────────

export type PersonaSpec = {
  id: string;
  gender: "female" | "male";
  ageGroup: "25-35" | "35-50" | "50-65";
  skinTone: "light" | "olive" | "medium" | "brown" | "deep";
  description: string;
};

/** Five personas covering gender, the three age groups and a range of skin tones. */
export const PERSONA_SPECS: PersonaSpec[] = [
  { id: "synth-01", gender: "female", ageGroup: "25-35", skinTone: "light", description: "a woman in her early thirties with light skin, freckles, shoulder-length auburn hair, green eyes" },
  { id: "synth-02", gender: "male", ageGroup: "35-50", skinTone: "deep", description: "a man in his mid forties with deep brown skin, short black hair with a little gray at the temples, a trimmed beard, brown eyes" },
  { id: "synth-03", gender: "female", ageGroup: "50-65", skinTone: "medium", description: "a woman in her late fifties with medium brown skin, silver-streaked dark hair in a low bun, laugh lines, dark brown eyes" },
  { id: "synth-04", gender: "male", ageGroup: "25-35", skinTone: "olive", description: "a man in his late twenties with olive skin, wavy dark hair, a slightly crooked nose, hazel eyes, clean shaven" },
  { id: "synth-05", gender: "male", ageGroup: "50-65", skinTone: "brown", description: "a man in his early sixties with brown skin, a receding gray hairline, rectangular glasses, a gray mustache, dark eyes" },
];

export function personaReferencePrompt(p: PersonaSpec): string {
  return `Photorealistic frontal portrait photo of ${p.description}. Neutral expression, looking straight at the camera, plain light gray background, soft even daylight, natural skin texture, no makeup, no retouching. Head and shoulders, plain dark t-shirt. Ordinary real person, not a model.`;
}

/** Six "bad selfies" from the reference: phone front camera, wide-angle distortion, mixed light, ±20° angles, different clothes, light noise. */
export const SELFIE_VARIANTS: string[] = [
  "Amateur smartphone front-camera selfie at arm's length, slight wide-angle distortion, indoors next to a window with daylight, facing the camera, wearing a casual gray t-shirt.",
  "Smartphone selfie in the evening under a warm table lamp, visible sensor noise, head turned about 20 degrees to the left, wearing a dark hoodie.",
  "Selfie in a bathroom mirror light, slightly high camera angle, overhead cool light, facing the camera, wearing a knit sweater.",
  "Outdoor selfie on an overcast day, head turned about 20 degrees to the right, wearing a casual jacket, slightly soft focus.",
  "Selfie in a parked car with harsh side sunlight on one half of the face, slight smile, facing the camera, wearing a plain shirt.",
  "Low-light evening selfie at home, noisy phone photo, slightly low camera angle, facing the camera, wearing a striped shirt.",
];

export function selfiePrompt(variant: string): string {
  return `The same person as in the reference photo — keep their identity, face shape, skin tone, age and hairline exactly. ${variant} Realistic, unflattering, unedited phone photo. No filters, no beautification, single person.`;
}

// ─── Demo edits (docs/07 §8): Studio tools ──────────────────────────────────

export const DEMO_EDITS: { tool: "background" | "outfit" | "retouch" | "relight"; option: string; prompt: string }[] = [
  { tool: "background", option: "modern-office", prompt: "Replace only the background with a softly blurred modern office. Keep the person, face, hair, clothing, pose and lighting on the face exactly the same." },
  { tool: "background", option: "city-bokeh", prompt: "Replace only the background with a softly blurred city street with bokeh lights. Keep the person, face, hair, clothing and pose exactly the same." },
  { tool: "outfit", option: "navy-suit", prompt: "Change only the clothing to a navy suit with a white shirt. Keep the face, hair, background, pose and lighting exactly the same." },
  { tool: "retouch", option: "balanced", prompt: "Apply a subtle, natural retouch: even out skin tone slightly and reduce shine, keep skin texture and every facial feature exactly the same. Change nothing else." },
  { tool: "relight", option: "soft-studio", prompt: "Relight the portrait with soft, even studio light. Keep the person, face, clothing and background exactly the same." },
];
