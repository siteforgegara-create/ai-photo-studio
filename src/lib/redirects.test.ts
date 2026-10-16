import { describe, expect, it } from "vitest";
import { getPostLoginRedirect, loginHref, sanitizeNext } from "./redirects";

const shoot = (id: string, createdAt: string, status: "ready" | "draft" | "refunded" = "ready") => ({ id, createdAt, status });

describe("getPostLoginRedirect (CLAUDE.md §6)", () => {
  it("goes to /shoot/new when the user has no shoots", () => {
    expect(getPostLoginRedirect([])).toBe("/shoot/new");
  });
  it("goes to the latest shoot", () => {
    expect(getPostLoginRedirect([shoot("a", "2026-10-02T00:00:00Z"), shoot("b", "2026-10-17T00:00:00Z")])).toBe("/shoot/b");
  });
  it("ignores drafts and refunded shoots", () => {
    expect(getPostLoginRedirect([shoot("d", "2026-10-20T00:00:00Z", "draft"), shoot("r", "2026-10-19T00:00:00Z", "refunded")])).toBe("/shoot/new");
  });
  it("prefers a safe `next`", () => {
    expect(getPostLoginRedirect([shoot("b", "2026-10-17T00:00:00Z")], "/pricing%23credits")).toBe("/pricing#credits");
  });
});

describe("sanitizeNext", () => {
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "/login", "/signup?x=1"])("rejects %s", (v) => {
    expect(sanitizeNext(v)).toBeNull();
  });
  it("accepts same-origin paths", () => {
    expect(sanitizeNext("/settings")).toBe("/settings");
  });
  it("builds a login href", () => {
    expect(loginHref("/pricing#credits")).toBe("/login?next=%2Fpricing%23credits");
  });
});
