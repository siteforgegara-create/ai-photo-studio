// @vitest-environment node
import { describe, expect, it } from "vitest";
import { accuracyTable, attributesLine, colorPrompt, compareValue, sanitizeReading, visionPrompt, voteAttributes, withColors, KEEP_COLORS, VISION_SYSTEM_PROMPT } from "./attributes";

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

  it("builds the prompt line: never the skin tone, always the keep-colors sentence", () => {
    expect(attributesLine(v)).toBe(`Subject details (preserve exactly): green eyes, auburn hair, freckles. ${KEEP_COLORS} Preserve apparent age exactly.`);
    expect(attributesLine(v)).not.toMatch(/fair|light skin/);
    const full = voteAttributes("x", Array.from({ length: 3 }, () => ({ eyeColor: "green", hairColor: "auburn", hairLength: "shoulder-length", hairTexture: "straight", skinTone: "fair", freckles: "yes" })));
    expect(attributesLine(full)).toBe("Subject details (preserve exactly): green eyes, auburn shoulder-length straight hair, freckles. Keep the exact skin tone and hair color from the photos. Preserve apparent age exactly.");
    const man = voteAttributes("y", Array.from({ length: 3 }, () => ({ glasses: "yes", facialHair: "mustache", hairColor: "gray", hairLength: "short", skinTone: "brown" })));
    expect(attributesLine(man)).toBe(`Subject details (preserve exactly): gray short hair, wears glasses, mustache. ${KEEP_COLORS} Preserve apparent age exactly.`);
    expect(attributesLine(null)).toBe(`${KEEP_COLORS} Preserve apparent age exactly.`);
  });

  it("hair / eye color from the all-selfies call replace the vote (auburn dropped at 50% comes back)", () => {
    const half = voteAttributes("synth-01", [{ hairColor: "auburn" }, { hairColor: "auburn" }, { hairColor: "red" }, { hairColor: "brown" }]);
    expect(half.kept.hairColor).toBeUndefined();
    const fin = withColors(half, { hairColor: "auburn", eyeColor: "unknown" });
    expect(fin.kept.hairColor?.value).toBe("auburn");
    expect(fin.kept.eyeColor).toBeUndefined(); // "unknown" never overrides
    expect(half.kept.hairColor).toBeUndefined(); // the vote itself is not changed
  });

  it("the color prompt sees all photos and discounts lighting", () => {
    const p = colorPrompt(6);
    expect(p).toContain("These 6 photos show the same person");
    expect(p).toMatch(/ignoring warm\/cool lighting/);
    expect(p).toContain('"hair_color"');
    expect(p).not.toContain("skin_tone");
    expect(p).toMatch(/Do not describe race, ethnicity, nationality or age/);
  });
});

describe("comparison with truth", () => {
  it("synonyms and neighbours", () => {
    expect(compareValue("hairColor", "gray", "salt-and-pepper")).toBe("exact");
    expect(compareValue("hairColor", "salt-and-pepper", "gray")).toBe("exact");
    expect(compareValue("hairLength", "shoulder-length", "chin-length")).toBe("approx");
    expect(compareValue("hairLength", "shoulder-length", "short")).toBe("wrong");
    expect(compareValue("skinTone", "deep", "brown")).toBe("close");
    expect(compareValue("skinTone", "fair", "light")).toBe("close");
    expect(compareValue("skinTone", "deep", "medium")).toBe("wrong");
  });

  it("accuracy: correct (with ~), close skin tone shown separately, dropped, wrong", () => {
    const results = [
      { subject: "synth-01", kept: { hairLength: { value: "chin-length", agreement: 1, votes: 3, of: 3 }, skinTone: { value: "light", agreement: 1, votes: 3, of: 3 }, eyeColor: { value: "hazel", agreement: 1, votes: 3, of: 3 } } },
      { subject: "synth-05", kept: { hairColor: { value: "salt-and-pepper", agreement: 1, votes: 3, of: 3 }, skinTone: { value: "brown", agreement: 1, votes: 3, of: 3 } } },
    ];
    const truths = new Map([
      ["synth-01", { hairLength: "shoulder-length", skinTone: "fair", eyeColor: "green", glasses: "no" }],
      ["synth-05", { hairColor: "gray", skinTone: "brown" }],
    ]);
    const by = Object.fromEntries(accuracyTable(results, truths).map((r) => [r.key, r]));
    expect(by.hairLength).toMatchObject({ compared: 1, correct: 1, approx: 1 });
    expect(by.hairColor).toMatchObject({ compared: 1, correct: 1, approx: 0 });
    expect(by.skinTone).toMatchObject({ compared: 2, correct: 1, close: [{ subject: "synth-01", truth: "fair", got: "light" }], wrong: [] });
    expect(by.eyeColor).toMatchObject({ compared: 1, correct: 0, wrong: [{ subject: "synth-01", truth: "green", got: "hazel" }] });
    expect(by.glasses).toMatchObject({ compared: 1, dropped: 1 });
  });
});
