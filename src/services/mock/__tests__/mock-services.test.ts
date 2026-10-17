import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuth, mockBilling, mockCredits, mockEdits, mockShoots, mockWaitlist } from "../index";
import { __resetMockDb, getDb } from "../db";
import { ServiceError } from "../../types";

describe("mock services", () => {
  beforeEach(() => __resetMockDb("guest"));
  afterEach(() => {
    vi.useRealTimers();
  });

  it("auth: rejects fail@example.com and short passwords", async () => {
    await expect(mockAuth.signIn({ email: "fail@example.com", password: "whatever123" })).rejects.toMatchObject({ code: "invalid-credentials" });
    await expect(mockAuth.signIn({ email: "a@b.co", password: "short" })).rejects.toBeInstanceOf(ServiceError);
  });

  it("auth: any email + 8-char password signs in; sign out returns to guest", async () => {
    const user = await mockAuth.signIn({ email: "me@example.com", password: "password1" });
    expect(user.email).toBe("me@example.com");
    expect(await mockAuth.getSession()).not.toBeNull();
    await mockAuth.signOut();
    expect(await mockAuth.getSession()).toBeNull();
  });

  it("guest sees no shoots and zero balance", async () => {
    expect(await mockShoots.list()).toEqual([]);
    expect(await mockCredits.getBalance()).toEqual({ credits: 0 });
  });

  it("has-shoot scenario: 2 shoots, balance = sum(ledger)", async () => {
    __resetMockDb("has-shoot");
    const shoots = await mockShoots.list();
    expect(shoots.map((s) => s.pack)).toEqual(["professional", "essential"]);
    const photos = await mockShoots.listPhotos(shoots[0]!.id);
    expect(photos.filter((p) => p.kind === "generated")).toHaveLength(50);
    expect(photos.filter((p) => p.kind === "edit").every((p) => p.parentId)).toBe(true);
    expect((await mockCredits.getBalance()).credits).toBe(30);
  });

  it("edits: insufficient credits never charges", async () => {
    __resetMockDb("new-user");
    await expect(mockEdits.create({ photoId: "x", tool: "creative", variants: 4 }, "k1")).rejects.toMatchObject({ code: "insufficient-credits" });
    expect(getDb().ledger).toHaveLength(0);
  });

  it("edits: idempotency key returns the same job and reserves once", async () => {
    __resetMockDb("has-shoot");
    const input = { photoId: "shoot_pro_1017_p001", tool: "background" as const, variants: 2 as const };
    const a = await mockEdits.create(input, "same-key");
    const b = await mockEdits.create(input, "same-key");
    expect(a.id).toBe(b.id);
    expect((await mockCredits.getBalance()).credits).toBe(28);
  });

  it("edits: failed edit returns the credits", async () => {
    vi.useFakeTimers();
    __resetMockDb("has-shoot", { failEdit: true });
    const job = await mockEdits.create({ photoId: "shoot_pro_1017_p001", tool: "outfit", variants: 4 }, "fail-key");
    expect((await mockCredits.getBalance()).credits).toBe(26);
    await vi.advanceTimersByTimeAsync(3000);
    const stored = getDb().editJobs.find((j) => j.id === job.id)!;
    expect(stored.status).toBe("failed");
    expect(stored.error?.refunded).toBe(true);
    expect((await mockCredits.getBalance()).credits).toBe(30);
    vi.useRealTimers();
  });

  it("preview: one per account (M5)", async () => {
    __resetMockDb("preview-used");
    const draft = await mockShoots.createDraft();
    await expect(mockShoots.requestPreview(draft.id, ["corporate-gray", "city-bokeh"])).rejects.toMatchObject({ code: "preview-used" });
  });

  it("refund: allowed until the first download (M6)", async () => {
    __resetMockDb("has-shoot");
    expect(await mockShoots.refundEligibility("shoot_pro_1017")).toEqual({ eligible: true });
    await mockShoots.download(["shoot_pro_1017_p001"], "original");
    expect(await mockShoots.refundEligibility("shoot_pro_1017")).toEqual({ eligible: false, reason: "downloaded" });
  });

  it("billing: shoot checkout returns the in-app success URL", async () => {
    __resetMockDb("new-user");
    const { url } = await mockBilling.startCheckout({ kind: "shoot", packId: "professional", shootId: "s1" });
    expect(url).toBe("/shoot/new?checkout=success&shoot=s1");
  });

  it("waitlist validates the email", async () => {
    await expect(mockWaitlist.join("nope", "2-10")).rejects.toMatchObject({ code: "validation" });
    await mockWaitlist.join("team@example.com", "11-50");
    expect(getDb().waitlist).toHaveLength(1);
  });
});
