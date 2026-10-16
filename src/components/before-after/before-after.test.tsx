import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BeforeAfter } from "./before-after";

describe("BeforeAfter slider (02-studio §4)", () => {
  const setup = () => render(<BeforeAfter before="/demo/headshot/before.webp" after="/demo/headshot/studio.webp" alt="Example comparison" />);

  it("exposes an accessible slider starting at 50", () => {
    setup();
    const slider = screen.getByRole("slider", { name: "Compare before and after" });
    expect(slider).toHaveAttribute("aria-valuenow", "50");
  });

  it("supports arrows ±2, Shift ±10, Home/End", () => {
    setup();
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider).toHaveAttribute("aria-valuenow", "52");
    fireEvent.keyDown(slider, { key: "ArrowLeft", shiftKey: true });
    expect(slider).toHaveAttribute("aria-valuenow", "42");
    fireEvent.keyDown(slider, { key: "Home" });
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    fireEvent.keyDown(slider, { key: "End" });
    expect(slider).toHaveAttribute("aria-valuenow", "100");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider).toHaveAttribute("aria-valuenow", "100");
  });
});
