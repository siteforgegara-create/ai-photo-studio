import { beforeEach, describe, expect, it } from "vitest";
import { useStudio } from "./store";

const initial = useStudio.getState();

describe("studio store", () => {
  beforeEach(() => {
    localStorage.clear();
    useStudio.setState(initial, true);
  });

  it("collapsing the panel keeps tab, tool and option selection", () => {
    const s = useStudio.getState();
    s.setTool("outfit");
    s.setOption("navy-suit");
    s.setTab("edits");
    s.togglePanel();
    expect(useStudio.getState()).toMatchObject({ panel: "closed", panelClosedByUser: true, tab: "edits", tool: "outfit" });
    useStudio.getState().togglePanel();
    expect(useStudio.getState()).toMatchObject({ panel: "open", panelClosedByUser: false, tab: "edits" });
    expect(useStudio.getState().optionByTool.outfit).toBe("navy-suit");
  });

  it("switching tools resets the job but remembers the option per tool", () => {
    const s = useStudio.getState();
    s.setOption("city-bokeh");
    s.patch({ job: { state: "failed", error: "x" } });
    s.setTool("retouch");
    expect(useStudio.getState().job.state).toBe("idle");
    useStudio.getState().setTool("background");
    expect(useStudio.getState().optionByTool.background).toBe("city-bokeh");
  });

  it("opening the panel clears the new-results dot", () => {
    useStudio.getState().togglePanel();
    useStudio.getState().patch({ panelDot: true });
    useStudio.getState().openPanel();
    expect(useStudio.getState().panelDot).toBe(false);
  });

  it("reset view keeps the compare toggle", () => {
    useStudio.getState().setView({ compare: false, zoom: 2, panX: 10 });
    useStudio.getState().resetView();
    expect(useStudio.getState().view).toEqual({ compare: false, zoom: 1, split: 50, panX: 0, panY: 0 });
  });

  it("persists only the documented fields", () => {
    useStudio.getState().setTab("shoot");
    useStudio.getState().togglePanel();
    const saved = JSON.parse(localStorage.getItem("aps.studio")!).state;
    expect(Object.keys(saved).sort()).toEqual(["panel", "panelClosedByUser", "showDemo", "skipConfirm", "variants"].sort());
  });
});
