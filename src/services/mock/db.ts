import { MOCK_DB_VERSION, defaultDevFlags, scenarioIds, seedScenario, type DevFlags, type MockDb, type ScenarioId } from "./scenarios";

/**
 * Tiny persistent store behind the mock services. Lives in localStorage so
 * the dev panel scenario, sign-in and wizard progress survive reloads.
 * Every access is wrapped: storage may be unavailable (private mode, SSR).
 */
const DB_KEY = "aps.mock.db";
const FLAGS_KEY = "aps.mock.flags";

type Listener = () => void;

let db: MockDb | null = null;
let flags: DevFlags | null = null;
const listeners = new Set<Listener>();

function canUseStorage() {
  return typeof window !== "undefined";
}

function readJson<T>(key: string): T | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — the mock keeps working in memory */
  }
}

function isValidDb(value: MockDb | null): value is MockDb {
  return !!value && value.version === MOCK_DB_VERSION && scenarioIds.includes(value.scenario);
}

export function getDb(): MockDb {
  if (!db) {
    const stored = readJson<MockDb>(DB_KEY);
    db = isValidDb(stored) ? stored : seedScenario("guest");
  }
  return db;
}

/** Mutates the db, persists it and notifies subscribers. */
export function updateDb(mutator: (draft: MockDb) => void) {
  const current = getDb();
  const next: MockDb = structuredClone(current);
  mutator(next);
  db = next;
  writeJson(DB_KEY, db);
  listeners.forEach((l) => l());
}

export function setScenario(scenario: ScenarioId) {
  db = seedScenario(scenario);
  writeJson(DB_KEY, db);
  listeners.forEach((l) => l());
}

export function onDbChange(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getFlags(): DevFlags {
  if (!flags) flags = { ...defaultDevFlags, ...(readJson<Partial<DevFlags>>(FLAGS_KEY) ?? {}) };
  return flags;
}

export function setFlags(patch: Partial<DevFlags>) {
  flags = { ...getFlags(), ...patch };
  writeJson(FLAGS_KEY, flags);
  listeners.forEach((l) => l());
}

/** Test helper: resets in-memory state (storage is cleared by the test env). */
export function __resetMockDb(scenario: ScenarioId = "guest", flagPatch: Partial<DevFlags> = {}) {
  db = seedScenario(scenario);
  flags = { ...defaultDevFlags, latencyMs: 0, ...flagPatch };
  listeners.clear();
}

export function delay(ms = getFlags().latencyMs) {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

let counter = 0;
export function newId(prefix: string) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}
