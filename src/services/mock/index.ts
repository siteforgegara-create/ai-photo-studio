import { creditPacks, quoteEdit, shootPacks } from "@/config/packs";
import { getShootPack } from "@/config/packs";
import type { AuthService } from "../auth";
import type { BillingService } from "../billing";
import type { CreditsService } from "../credits";
import type { EditsService } from "../edits";
import type { ShootsService } from "../shoots";
import type { WaitlistService } from "../waitlist";
import {
  ServiceError,
  type EditJob,
  type Preview,
  type Shoot,
  type ShootPhoto,
  type User,
} from "../types";
import { delay, getDb, getFlags, newId, onDbChange, setScenario, updateDb } from "./db";
import { fixtureUser, makePhotos } from "./scenarios";

const MIN_PASSWORD = 8;
const FAIL_EMAIL = "fail@example.com";
const nowIso = () => new Date().toISOString();
const addDaysIso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

function requireUser(): User {
  const user = getDb().user;
  if (!user) throw new ServiceError("unauthorized", "Please sign in to continue.");
  return user;
}

function balance(): number {
  return getDb().ledger.reduce((sum, e) => sum + e.delta, 0);
}

function findShoot(id: string): Shoot {
  const shoot = getDb().shoots.find((s) => s.id === id);
  if (!shoot) throw new ServiceError("not-found", "Shoot not found.");
  return shoot;
}

/* ───────────────────────── Auth ───────────────────────── */

export const mockAuth: AuthService = {
  async getSession() {
    await delay(0);
    return getDb().user;
  },
  async signIn({ email, password }) {
    await delay();
    if (email.trim().toLowerCase() === FAIL_EMAIL || password.length < MIN_PASSWORD) {
      throw new ServiceError("invalid-credentials", "Incorrect email or password.");
    }
    const current = getDb();
    if (current.scenario === "guest") setScenario("new-user");
    updateDb((d) => {
      d.user = { ...(d.user ?? fixtureUser), email: email.trim() };
    });
    return getDb().user!;
  },
  async signUp({ fullName, email, password }) {
    await delay();
    if (password.length < MIN_PASSWORD) throw new ServiceError("validation", "Password must be at least 8 characters.");
    setScenario("new-user");
    updateDb((d) => {
      d.user = { ...fixtureUser, id: newId("user"), fullName: fullName.trim(), email: email.trim(), emailVerified: false };
    });
    return getDb().user!;
  },
  async signInWithGoogle() {
    await delay();
    if (getDb().scenario === "guest") setScenario("new-user");
    updateDb((d) => {
      d.user = { ...(d.user ?? fixtureUser), provider: "google", emailVerified: true };
    });
    return getDb().user!;
  },
  async signOut() {
    await delay(0);
    setScenario("guest");
  },
  async requestPasswordReset() {
    await delay();
  },
  async resetPassword(token, newPassword) {
    await delay();
    if (token === "expired") throw new ServiceError("validation", "This reset link has expired.");
    if (newPassword.length < MIN_PASSWORD) throw new ServiceError("validation", "Password must be at least 8 characters.");
  },
  async changePassword(currentPassword, newPassword) {
    await delay();
    const user = requireUser();
    if (user.provider === "google") throw new ServiceError("validation", "You sign in with Google, so there's no password to change.");
    if (currentPassword.length < MIN_PASSWORD) throw new ServiceError("invalid-credentials", "Your current password is incorrect.");
    if (newPassword.length < MIN_PASSWORD) throw new ServiceError("validation", "Password must be at least 8 characters.");
  },
  async deleteAccount() {
    await delay();
    requireUser();
    setScenario("guest");
  },
  async updateProfile({ fullName }) {
    await delay();
    requireUser();
    updateDb((d) => {
      d.user = { ...d.user!, fullName: fullName.trim() };
    });
    return getDb().user!;
  },
  onAuthStateChange(listener) {
    let last = getDb().user;
    return onDbChange(() => {
      const next = getDb().user;
      if (JSON.stringify(next) !== JSON.stringify(last)) {
        last = next;
        listener(next);
      }
    });
  },
};

/* ───────────────────────── Shoots ───────────────────────── */

const GENERATION_STEP = 4;

export const mockShoots: ShootsService = {
  async createDraft(input = {}) {
    await delay();
    const shoot: Shoot = {
      id: newId("shoot"),
      pack: input.pack ?? "professional",
      status: "draft",
      styleIds: input.styleIds ?? [],
      targetCount: 0,
      readyCount: 0,
      createdAt: nowIso(),
      refundable: false,
      outfit: input.outfit,
      glasses: input.glasses,
    };
    updateDb((d) => {
      d.shoots.unshift(shoot);
    });
    return shoot;
  },
  async updateDraft(shootId, input) {
    await delay();
    updateDb((d) => {
      const s = d.shoots.find((x) => x.id === shootId);
      if (s) Object.assign(s, input.pack ? { ...input, pack: input.pack } : input);
    });
    return findShoot(shootId);
  },
  async uploadSelfie(shootId, file, check, localId) {
    requireUser();
    await delay();
    const previewUrl = typeof URL !== "undefined" && "createObjectURL" in URL ? URL.createObjectURL(file) : "";
    const selfie = { id: newId("selfie"), localId, previewUrl, check, shootId };
    updateDb((d) => {
      d.selfies.push(selfie);
    });
    return selfie;
  },
  async requestPreview(shootId, styleIds) {
    const user = requireUser();
    await delay();
    if (user.previewUsed) throw new ServiceError("preview-used", "You've already used your free preview.");
    updateDb((d) => {
      d.user = { ...d.user!, previewUsed: true };
      const s = d.shoots.find((x) => x.id === shootId);
      if (s) {
        s.status = "previewing";
        s.styleIds = [...styleIds];
      }
    });
    setTimeout(() => {
      if (getFlags().failGeneration) {
        // Generation failed: the free preview is given back and the draft returns to `draft`.
        updateDb((d) => {
          const s = d.shoots.find((x) => x.id === shootId);
          if (s) s.status = "draft";
          if (d.user) d.user = { ...d.user, previewUsed: false };
        });
        return;
      }
      updateDb((d) => {
        const s = d.shoots.find((x) => x.id === shootId);
        if (!s) return;
        s.status = "preview_ready";
        d.previews = d.previews.filter((p) => p.shootId !== shootId);
        styleIds.forEach((styleId, si) =>
          [0, 1].forEach((k) =>
            d.previews.push({
              id: `${shootId}_pv${si}${k}`,
              shootId,
              styleId,
              url: makePhotos({ ...s, styleIds: [styleId] }, 1)[0]!.url,
            }),
          ),
        );
      });
    }, getFlags().previewDelayMs);
    return findShoot(shootId);
  },
  async getPreviews(shootId) {
    await delay();
    return getDb()
      .previews.filter((p) => p.shootId === shootId)
      .map(toPreview);
  },
  async checkout(shootId, packId, styleIds) {
    requireUser();
    await delay();
    const pack = getShootPack(packId);
    const existing = findShoot(shootId);
    if (existing.status === "generating" || existing.status === "ready") return existing; // idempotent (webhook retries)
    updateDb((d) => {
      const s = d.shoots.find((x) => x.id === shootId);
      if (!s) return;
      Object.assign(s, {
        pack: packId,
        status: "generating",
        styleIds,
        targetCount: pack.photos,
        readyCount: 0,
        refundable: true,
        coverUrl: makePhotos({ ...s, styleIds }, 1)[0]?.url,
      } satisfies Partial<Shoot>);
      d.ledger.push({ id: newId("ledger"), createdAt: nowIso(), label: `${pack.name} shoot · edit credits`, delta: pack.editCredits });
    });
    return findShoot(shootId);
  },
  async get(shootId) {
    await delay();
    const user = getDb().user;
    if (!user) return null;
    return getDb().shoots.find((s) => s.id === shootId) ?? null;
  },
  async list() {
    await delay();
    if (!getDb().user) return [];
    return getDb()
      .shoots.filter((s) => s.status !== "draft" && s.status !== "previewing" && s.status !== "preview_ready")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async listPhotos(shootId) {
    await delay();
    return getDb().photos.filter((p) => p.shootId === shootId);
  },
  async getPhoto(photoId) {
    await delay();
    return getDb().photos.find((p) => p.id === photoId) ?? null;
  },
  subscribe(shootId, listener) {
    const emit = () => {
      const shoot = getDb().shoots.find((s) => s.id === shootId);
      if (!shoot) return;
      listener({
        shoot,
        photos: getDb().photos.filter((p) => p.shootId === shootId),
        previews: getDb()
          .previews.filter((p) => p.shootId === shootId)
          .map(toPreview),
      });
    };
    const off = onDbChange(emit);
    const timer = setInterval(() => {
      const shoot = getDb().shoots.find((s) => s.id === shootId);
      if (!shoot || shoot.status !== "generating" || getFlags().failGeneration) return;
      updateDb((d) => {
        const s = d.shoots.find((x) => x.id === shootId)!;
        const next = Math.min(s.targetCount, s.readyCount + GENERATION_STEP);
        const existing = d.photos.filter((p) => p.shootId === shootId).length;
        d.photos.push(...makePhotos(s, next).slice(existing));
        s.readyCount = next;
        if (next >= s.targetCount) {
          s.status = "ready";
          s.expiresAt = addDaysIso(30);
        }
      });
    }, getFlags().generationTickMs);
    queueMicrotask(emit);
    return () => {
      off();
      clearInterval(timer);
    };
  },
  async favorite(photoId, isFavorite) {
    await delay(0);
    updateDb((d) => {
      const p = d.photos.find((x) => x.id === photoId);
      if (p) p.isFavorite = isFavorite;
    });
    const photo = getDb().photos.find((p) => p.id === photoId);
    if (!photo) throw new ServiceError("not-found", "Photo not found.");
    return photo;
  },
  async download(photoIds, format) {
    await delay();
    const photos = getDb().photos.filter((p) => photoIds.includes(p.id));
    updateDb((d) => {
      d.downloads.push(...photoIds);
      const shootIds = new Set(photos.map((p) => p.shootId));
      d.shoots.forEach((s) => {
        if (shootIds.has(s.id)) s.refundable = false;
      });
    });
    return { url: format === "zip" ? "#mock-zip" : (photos[0]?.url ?? "#") };
  },
  async rename(shootId, title) {
    await delay();
    updateDb((d) => {
      const s = d.shoots.find((x) => x.id === shootId);
      if (s) s.title = title.trim() || undefined;
    });
    return findShoot(shootId);
  },
  async deleteNow(shootId) {
    await delay();
    updateDb((d) => {
      d.shoots = d.shoots.filter((s) => s.id !== shootId);
      d.photos = d.photos.filter((p) => p.shootId !== shootId);
      d.previews = d.previews.filter((p) => p.shootId !== shootId);
      d.selfies = d.selfies.filter((p) => p.shootId !== shootId);
    });
  },
  async deleteAllPhotos() {
    await delay();
    requireUser();
    updateDb((d) => {
      d.shoots = [];
      d.photos = [];
      d.previews = [];
      d.selfies = [];
    });
  },
  async refundEligibility(shootId) {
    await delay(0);
    const s = findShoot(shootId);
    if (s.status === "refunded") return { eligible: false, reason: "refunded" };
    if (s.status !== "ready" && s.status !== "generating" && s.status !== "paid") return { eligible: false, reason: "not-paid" };
    if (!s.refundable) return { eligible: false, reason: "downloaded" };
    return { eligible: true };
  },
  async requestRefund(shootId) {
    await delay();
    const eligibility = await mockShoots.refundEligibility(shootId);
    if (!eligibility.eligible) throw new ServiceError("validation", "This shoot is no longer eligible for a refund.");
    updateDb((d) => {
      const s = d.shoots.find((x) => x.id === shootId)!;
      s.status = "refunded";
      s.refundable = false;
    });
    return findShoot(shootId);
  },
};

/* ───────────────────────── Edits ───────────────────────── */

const EDIT_DURATION_MS = 2500;

export const mockEdits: EditsService = {
  async quote(input) {
    await delay(0);
    return quoteEdit(input.tool, input.variants);
  },
  async create(input, idempotencyKey) {
    requireUser();
    await delay();
    const existing = getDb().editJobs.find((j) => j.idempotencyKey === idempotencyKey);
    if (existing) return stripJob(existing);

    const { credits } = quoteEdit(input.tool, input.variants);
    const have = balance();
    if (credits > have) {
      throw new ServiceError("insufficient-credits", `Not enough credits. This edit needs ${credits}, you have ${have}.`);
    }
    const job = {
      id: newId("job"),
      status: "generating" as const,
      results: [] as ShootPhoto[],
      idempotencyKey,
      photoId: input.photoId,
      credits,
    };
    updateDb((d) => {
      d.editJobs.push(job);
      if (credits > 0) d.ledger.push({ id: newId("ledger"), createdAt: nowIso(), label: `Reserved · ${input.tool} edit`, delta: -credits });
    });

    setTimeout(() => {
      const { failEdit, blockEdit } = getFlags();
      updateDb((d) => {
        const j = d.editJobs.find((x) => x.id === job.id);
        if (!j) return;
        if (failEdit || blockEdit) {
          j.status = blockEdit ? "blocked" : "failed";
          j.error = {
            code: blockEdit ? "blocked" : "provider-error",
            message: "We couldn't complete this edit. Your credits were returned.",
            refunded: true,
          };
          if (credits > 0) d.ledger.push({ id: newId("ledger"), createdAt: nowIso(), label: "Edit refunded", delta: credits });
          return;
        }
        const parent = d.photos.find((p) => p.id === input.photoId);
        const results: ShootPhoto[] = Array.from({ length: input.variants }, (_, i) => ({
          id: `${job.id}_r${i + 1}`,
          shootId: parent?.shootId ?? "unknown",
          styleId: parent?.styleId,
          parentId: input.photoId,
          kind: "edit",
          url: parent?.url ?? "/demo/headshot/studio.webp",
          thumbUrl: parent?.thumbUrl ?? "/demo/headshot/studio.webp",
          width: 1080,
          height: 1350,
          isFavorite: false,
        }));
        j.status = "completed";
        j.results = results;
        d.photos.push(...results);
      });
    }, EDIT_DURATION_MS);

    return stripJob(job);
  },
  subscribe(jobId, listener) {
    const emit = () => {
      const job = getDb().editJobs.find((j) => j.id === jobId);
      if (job) listener(stripJob(job));
    };
    queueMicrotask(emit);
    return onDbChange(emit);
  },
};

function toPreview(p: Preview): Preview {
  return { id: p.id, styleId: p.styleId, url: p.url };
}

function stripJob(job: EditJob): EditJob {
  const { id, status, results, error } = job;
  return error ? { id, status, results, error } : { id, status, results };
}

/* ───────────────────────── Credits / Billing / Waitlist ───────────────────────── */

export const mockCredits: CreditsService = {
  async getBalance() {
    await delay(0);
    return { credits: getDb().user ? balance() : 0 };
  },
  async getLedger() {
    await delay();
    if (!getDb().user) return [];
    return [...getDb().ledger].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async getCreditPacks() {
    await delay(0);
    return [...creditPacks];
  },
  onBalanceChange(listener) {
    let last = balance();
    return onDbChange(() => {
      const next = getDb().user ? balance() : 0;
      if (next !== last) {
        last = next;
        listener({ credits: next });
      }
    });
  },
};

export const mockBilling: BillingService = {
  async getShootPacks() {
    await delay(0);
    return [...shootPacks];
  },
  async startCheckout(target) {
    requireUser();
    await delay();
    if (target.kind === "shoot") {
      return { url: `/shoot/new?checkout=success&shoot=${encodeURIComponent(target.shootId)}` };
    }
    // TODO(B5): Lemon Squeezy overlay checkout for credit packs.
    const pack = creditPacks.find((p) => p.id === target.creditPackId);
    if (!pack) throw new ServiceError("not-found", "Unknown credit pack.");
    return { url: `/pricing?checkout=success&ref=${encodeURIComponent(`${pack.id}~${newId("co")}`)}#credits` };
  },
  async confirmCreditPurchase(checkoutId) {
    requireUser();
    await delay();
    const [packId] = checkoutId.split("~");
    const pack = creditPacks.find((p) => p.id === packId);
    if (!pack) throw new ServiceError("not-found", "We couldn't find this order.");
    const entryId = `purchase_${checkoutId}`;
    // Idempotent: reloading the return page doesn't add credits twice.
    if (!getDb().ledger.some((e) => e.id === entryId)) {
      updateDb((d) => {
        d.ledger.push({ id: entryId, createdAt: nowIso(), label: `Credit pack · ${pack.credits} credits`, delta: pack.credits });
      });
    }
    return { credits: pack.credits };
  },
};

export const mockWaitlist: WaitlistService = {
  async join(email, teamSize) {
    await delay();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new ServiceError("validation", "Enter a valid email address.");
    updateDb((d) => {
      d.waitlist.push({ email, teamSize });
    });
  },
};
