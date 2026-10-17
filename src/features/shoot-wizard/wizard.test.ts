import { describe, expect, it } from "vitest";
import { normalizeStyles, togglePick } from "./store";

describe("wizard style selection", () => {
  it("togglePick adds up to the limit and removes on second click", () => {
    expect(togglePick([], "a", 2)).toEqual(["a"]);
    expect(togglePick(["a", "b"], "c", 2)).toEqual(["a", "b"]);
    expect(togglePick(["a", "b"], "a", 2)).toEqual(["b"]);
  });
  it("normalizeStyles keeps preview styles first and trims to the pack", () => {
    expect(normalizeStyles("essential", ["x", "y", "z"])).toEqual(["x", "y"]);
    expect(normalizeStyles("professional", [], ["corporate-gray", "city-bokeh"])).toEqual(["corporate-gray", "city-bokeh"]);
  });
  it("Executive gets every style", () => {
    expect(normalizeStyles("executive", [])).toHaveLength(12);
  });
});
