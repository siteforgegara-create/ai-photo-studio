// @vitest-environment node
import { describe, expect, it } from "vitest";
import { accuracyTable, attributesLine, sanitizeReading, visionPrompt, voteAttributes, VISION_SYSTEM_PROMPT } from "./attributes";

describe("sanitizeReading — visible attributes only", () => {
  it("keeps the fixed vocabulary, normalises synonyms and snake_case keys", () => {
    const r = sanitizeReading('Sure! ```json\n{"eye_color":"Green","hair_color":"grey","hair_length":"shoulder length","hair_texture":"straight","skin_tone":"fair","freckles":true,"glasses":"no","facial_hair":"clean shaven","distinctive_marks":["Mole on left cheek"]}\n```');
    expect(r).toEqual({ eyeColor: "green", hairColor: "gray", hairLength: "shoulder-length", hairTexture: "straight", skinTone: "fair", freckles: "yes", glasses: "no", facialHair: "none", distinctiveMarks: ["mole on left cheek"] });
  });

  it("never stores race, ethnicity or a numeric age — not as keys, not inside marks", () => {
    const r = sanitizeReading({ race: "x", ethnicity: "y", age: 42, apparent_age: "40s", skin_tone: "deep", distinctive_marks: ["looks 40 years old", "Asian features", "scar above right eyebrow"] });
    expect(r).toEqual({ skinTone: "deep", distinctiveMarks: ["scar above right eyebrow"] });
    expect(JSON.stringify(r)).not.toMatch(/race|ethnic|age|40|asian/i);
  });

  it("drops values outside the vocabulary and unparsable answers", () => {
    expect(sanitizeReading({ eye_color: "violet", skin_tone: "caramel" })).toEqual({});
    expect(sanitizeReading("I cannot help with that.")).toEqual({});
  });

  it("the prompt asks for the attributes and forbids race, ethnicity and age", () => {
    expect(visionPrompt()).toContain('"skin_tone": one of "fair", "light", "medium", "olive", "brown", "deep"');
    expect(visionPrompt()).toMatch(/Do not describe race, ethnicity, nationality or age/);
    expect(VISION_SYSTEM_PROMPT).toMatch(/Never mention, guess or infer race, ethnicity/);
  });
});

describe("voteAttributes — majority over selfies, < 60% dropped", () => {
  const readings = [
    { eyeColor: "green", hairColor: "auburn", skinTone: "fair", freckles: "yes", glasses: "no" },
    { eyeColor: "green", hairColor: "auburn", skinTone: "light", freckles: "yes", glasses: "no" },
    { eyeColor: "hazel", hairColor: "auburn", skinTone: "fair", freckles: "unknown", glasses: "no" },
    { eyeColor: "green", hairColor: "red", skinTone: "light", freckles: "yes", glasses: "no" },
    { eyeColor: "unknown", hairColor: "auburn", skinTone: "fair", freckles: "no", glasses: "no", distinctiveMarks: ["mole on left cheek"] },
  ];
  const v = voteAttributes("synth-01", readings);

  it("keeps attributes with ≥ 60% agreement (unknown counts against)", () => {
    expect(v.kept.eyeColor).toEqual({ value: "green", agreement: 0.6, votes: 3, of: 5 });
    expect(v.kept.hairColor?.value).toBe("auburn");
    expect(v.kept.skinTone?.value).toBe("fair");
    expect(v.kept.freckles?.value).toBe("yes");
    expect(v.kept.glasses?.value).toBe("no");
  });

  it("drops the rest, including a mark seen once", () => {
    expect(v.kept.hairLength).toBeUndefined();
    expect(v.dropped.map((d) => d.key)).toContain("hairLength");
    expect(v.marks).toEqual([]);
    expect(v.dropped.some((d) => d.key === "mark: mole on left cheek")).toBe(true);
  });

  it("builds the prompt line", () => {
    expect(attributesLine(v)).toBe("Subject details (preserve exactly): green eyes, auburn hair, fair skin with freckles. Preserve apparent age exactly.");
    const full = voteAttributes("x", Array.from({ length: 3 }, () => ({ eyeColor: "green", hairColor: "auburn", hairLength: "shoulder-length", hairTexture: "straight", skinTone: "fair", freckles: "yes" })));
    expect(attributesLine(full)).toBe("Subject details (preserve exactly): green eyes, auburn shoulder-length straight hair, fair skin with freckles. Preserve apparent age exactly.");
    const man = voteAttributes("y", Array.from({ length: 3 }, () => ({ glasses: "yes", facialHair: "mustache", hairColor: "gray", hairLength: "short", skinTone: "brown" })));
    expect(attributesLine(man)).toBe("Subject details (preserve exactly): gray short hair, brown skin, wears glasses, mustache. Preserve apparent age exactly.");
    expect(attributesLine(null)).toBe("Preserve apparent age exactly.");
  });

  it("accuracy vs truth per attribute: correct, dropped, wrong", () => {
    const rows = accuracyTable([v], new Map([["synth-01", { eyeColor: "green", hairLength: "shoulder-length", skinTone: "light" }]]));
    const by = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(by.eyeColor).toMatchObject({ compared: 1, correct: 1, dropped: 0 });
    expect(by.hairLength).toMatchObject({ compared: 1, correct: 0, dropped: 1 });
    expect(by.skinTone).toMatchObject({ compared: 1, correct: 0, wrong: [{ subject: "synth-01", truth: "light", got: "fair" }] });
    expect(by.glasses).toMatchObject({ compared: 0 });
  });
});
