/**
 * Visible-appearance attributes (bench:analyze) — pure logic, tested in
 * attributes.test.ts.
 *
 * Only what can be seen in a photo. Race, ethnic origin and numeric age are
 * never asked for, never parsed and never stored: anything outside the
 * fixed vocabulary below is dropped, and free-text marks that mention
 * ethnicity or an age are discarded.
 */

export const ATTRIBUTE_KEYS = [
  "eyeColor",
  "hairColor",
  "hairLength",
  "hairTexture",
  "skinTone",
  "freckles",
  "glasses",
  "facialHair",
  "distinctiveMarks",
] as const;
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

/** Allowed values. "unknown" = not visible in this photo (counts as disagreement in the vote). */
export const VOCAB = {
  eyeColor: ["dark brown", "brown", "hazel", "amber", "green", "blue", "gray", "unknown"],
  hairColor: ["black", "dark brown", "brown", "light brown", "blonde", "auburn", "red", "salt-and-pepper", "gray", "white", "none", "unknown"],
  hairLength: ["bald", "buzz", "short", "ear-length", "chin-length", "shoulder-length", "long", "tied back", "unknown"],
  hairTexture: ["straight", "wavy", "curly", "coily", "none", "unknown"],
  skinTone: ["fair", "light", "medium", "olive", "brown", "deep"],
  freckles: ["yes", "no", "unknown"],
  glasses: ["yes", "no", "unknown"],
  facialHair: ["none", "stubble", "mustache", "goatee", "short beard", "full beard", "unknown"],
} as const satisfies Record<Exclude<AttributeKey, "distinctiveMarks">, readonly string[]>;

export type EnumKey = keyof typeof VOCAB;
export const ENUM_KEYS = Object.keys(VOCAB) as EnumKey[];

/** One selfie's reading. */
export type SelfieAttributes = Partial<Record<EnumKey, string>> & { distinctiveMarks?: string[] };

/** Ground truth for synthetic personas (subjects.json "truth"); a missing key is not compared. */
export type AttributeTruth = Partial<Record<EnumKey, string>>;

/** Votes needed to keep an attribute (docs/07: below 60% agreement → dropped). */
export const AGREEMENT_MIN = 0.6;

export type VotedAttribute = { value: string; agreement: number; votes: number; of: number };
export type SubjectAttributes = {
  subject: string;
  selfies: number;
  analyzed: number;
  kept: Partial<Record<EnumKey, VotedAttribute>>;
  marks: VotedAttribute[];
  dropped: { key: string; best: string | null; agreement: number }[];
};

/** Words that would turn a mark into an ethnicity or age statement — such marks are discarded. */
const FORBIDDEN_MARK = /\b(race|racial|ethnic\w*|asian|african|european|caucasian|hispanic|latin[oa]|arab\w*|indian|black|white|years?|yrs?|aged?|old|young|teen\w*|\d+)\b/i;

/**
 * Model output → the allowed vocabulary. Accepts an object or a string that
 * contains one JSON object (models sometimes wrap it in prose or a code fence).
 */
export function sanitizeReading(raw: unknown): SelfieAttributes {
  let obj: Record<string, unknown> | null = null;
  if (raw && typeof raw === "object") obj = raw as Record<string, unknown>;
  else if (typeof raw === "string") {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        obj = JSON.parse(m[0]) as Record<string, unknown>;
      } catch {
        obj = null;
      }
    }
  }
  if (!obj) return {};
  const out: SelfieAttributes = {};
  const aliases: Record<string, EnumKey | "distinctiveMarks"> = {
    eye_color: "eyeColor",
    eyecolor: "eyeColor",
    hair_color: "hairColor",
    haircolor: "hairColor",
    hair_length: "hairLength",
    hairlength: "hairLength",
    hair_texture: "hairTexture",
    hairtexture: "hairTexture",
    skin_tone: "skinTone",
    skintone: "skinTone",
    freckles: "freckles",
    glasses: "glasses",
    facial_hair: "facialHair",
    facialhair: "facialHair",
    distinctive_marks: "distinctiveMarks",
    distinctivemarks: "distinctiveMarks",
  };
  for (const [k, v] of Object.entries(obj)) {
    const key = aliases[k.toLowerCase()] ?? aliases[k.replace(/([A-Z])/g, "_$1").toLowerCase()];
    if (!key) continue; // race, ethnicity, age and anything else: ignored
    if (key === "distinctiveMarks") {
      const list = Array.isArray(v) ? v : typeof v === "string" && v ? [v] : [];
      const marks = list
        .filter((x): x is string => typeof x === "string")
        .map(normalizeMark)
        .filter((x) => x && x !== "none" && !FORBIDDEN_MARK.test(x));
      if (marks.length) out.distinctiveMarks = [...new Set(marks)].slice(0, 5);
      continue;
    }
    const value = normalizeValue(key, v);
    if (value) out[key] = value;
  }
  return out;
}

function normalizeMark(s: string): string {
  return s.toLowerCase().replace(/[^a-z\s-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

function normalizeValue(key: EnumKey, v: unknown): string | null {
  if (typeof v === "boolean") return key === "freckles" || key === "glasses" ? (v ? "yes" : "no") : null;
  if (typeof v !== "string") return null;
  let s = v.toLowerCase().trim().replace(/_/g, " ").replace(/\s+/g, " ");
  const synonyms: Record<string, string> = {
    grey: "gray",
    "salt and pepper": "salt-and-pepper",
    blond: "blonde",
    "shoulder length": "shoulder-length",
    "ear length": "ear-length",
    "chin length": "chin-length",
    "clean shaven": "none",
    "clean-shaven": "none",
    beard: "short beard",
    moustache: "mustache",
    "not visible": "unknown",
    true: "yes",
    false: "no",
  };
  s = s.replace(/\bgrey\b/g, "gray");
  s = synonyms[s] ?? s;
  return (VOCAB[key] as readonly string[]).includes(s) ? s : null;
}

/** Majority vote over the selfies of one subject; < AGREEMENT_MIN of the analyzed selfies → dropped. */
export function voteAttributes(subject: string, readings: SelfieAttributes[], selfies = readings.length): SubjectAttributes {
  const of = readings.length;
  const kept: SubjectAttributes["kept"] = {};
  const dropped: SubjectAttributes["dropped"] = [];
  for (const key of ENUM_KEYS) {
    const counts = new Map<string, number>();
    for (const r of readings) {
      const v = r[key];
      if (v && v !== "unknown") counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const [best, votes] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? [null, 0];
    const agreement = of ? votes / of : 0;
    if (best && agreement >= AGREEMENT_MIN - 1e-9) kept[key] = { value: best, agreement: round2(agreement), votes, of };
    else dropped.push({ key, best, agreement: round2(agreement) });
  }
  const markCounts = new Map<string, number>();
  for (const r of readings) for (const m of new Set(r.distinctiveMarks ?? [])) markCounts.set(m, (markCounts.get(m) ?? 0) + 1);
  const marks: VotedAttribute[] = [];
  for (const [m, votes] of markCounts) {
    const agreement = of ? votes / of : 0;
    if (agreement >= AGREEMENT_MIN - 1e-9) marks.push({ value: m, agreement: round2(agreement), votes, of });
    else dropped.push({ key: `mark: ${m}`, best: m, agreement: round2(agreement) });
  }
  return { subject, selfies, analyzed: of, kept, marks, dropped };
}

/**
 * The line every model gets in its prompt, e.g.
 * "Subject details (preserve exactly): green eyes, auburn shoulder-length straight hair, fair skin with freckles. Preserve apparent age exactly."
 */
export function attributesLine(a: Pick<SubjectAttributes, "kept" | "marks"> | null): string {
  const k = a?.kept ?? {};
  const v = (key: EnumKey) => k[key]?.value;
  const parts: string[] = [];
  if (v("eyeColor")) parts.push(`${v("eyeColor")} eyes`);
  const hairColor = v("hairColor");
  const hairLength = v("hairLength");
  const hairTexture = v("hairTexture");
  if (hairLength === "bald" || hairColor === "none") parts.push("bald");
  else if (hairColor || hairLength || hairTexture) {
    const length = hairLength === "tied back" ? undefined : hairLength;
    const texture = hairTexture === "none" ? undefined : hairTexture;
    parts.push(`${[hairColor, length, texture].filter(Boolean).join(" ")} hair${hairLength === "tied back" ? " tied back" : ""}`);
  }
  if (v("skinTone")) parts.push(`${v("skinTone")} skin${v("freckles") === "yes" ? " with freckles" : ""}`);
  else if (v("freckles") === "yes") parts.push("freckles");
  if (v("glasses") === "yes") parts.push("wears glasses");
  const fh = v("facialHair");
  // "none" is not written: "clean-shaven" reads oddly for women, and the base prompt already preserves the face.
  if (fh && fh !== "none") parts.push(fh);
  for (const m of a?.marks ?? []) parts.push(m.value);
  const details = parts.length ? `Subject details (preserve exactly): ${parts.join(", ")}. ` : "";
  return `${details}Preserve apparent age exactly.`;
}

export type AccuracyRow = { key: EnumKey; compared: number; correct: number; dropped: number; wrong: { subject: string; truth: string; got: string }[] };

/** Per attribute: of the synthetic personas with a truth value, how many the vote got right / dropped / wrong. */
export function accuracyTable(results: SubjectAttributes[], truths: Map<string, AttributeTruth>): AccuracyRow[] {
  return ENUM_KEYS.map((key) => {
    const row: AccuracyRow = { key, compared: 0, correct: 0, dropped: 0, wrong: [] };
    for (const r of results) {
      const truth = truths.get(r.subject)?.[key];
      if (!truth) continue;
      row.compared += 1;
      const got = r.kept[key]?.value;
      if (!got) row.dropped += 1;
      else if (got === truth) row.correct += 1;
      else row.wrong.push({ subject: r.subject, truth, got });
    }
    return row;
  });
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

// ─── Vision prompt ──────────────────────────────────────────────────────────

export const VISION_SYSTEM_PROMPT =
  "You describe only what is visible in a photo, for a photo-editing quality check. Never mention, guess or infer race, ethnicity, ethnic origin, nationality or age. Answer with a single JSON object and nothing else.";

/** One selfie → JSON with the fixed vocabulary (snake_case keys, one value per key). */
export function visionPrompt(): string {
  const line = (key: string, values: readonly string[]) => `  "${key}": one of ${values.map((v) => `"${v}"`).join(", ")}`;
  return [
    "Look at the single person in this photo and describe only clearly visible features.",
    "Return exactly this JSON object:",
    "{",
    line("eye_color", VOCAB.eyeColor) + ",",
    line("hair_color", VOCAB.hairColor) + ",",
    line("hair_length", VOCAB.hairLength) + ",",
    line("hair_texture", VOCAB.hairTexture) + ",",
    line("skin_tone", VOCAB.skinTone) + ",",
    line("freckles", VOCAB.freckles) + ",",
    line("glasses", VOCAB.glasses) + ",",
    line("facial_hair", VOCAB.facialHair) + ",",
    '  "distinctive_marks": up to 3 short visible features such as "mole on left cheek" or "scar above right eyebrow", or []',
    "}",
    'Use "unknown" when a feature is not clearly visible (lighting, angle, blur). Judge skin tone on evenly lit skin, ignoring color casts.',
    "Do not add any other keys. Do not describe race, ethnicity, nationality or age.",
  ].join("\n");
}
