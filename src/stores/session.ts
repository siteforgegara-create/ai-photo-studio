"use client";

import { create } from "zustand";
import { authService, creditsService, shootsService } from "@/services";
import type { Shoot, User } from "@/services/types";

type SessionStatus = "loading" | "guest" | "authenticated";

type SessionState = {
  status: SessionStatus;
  user: User | null;
  credits: number;
  shoots: Shoot[];
  /** Subscribes to the auth + credit services once per page load. */
  init: () => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Set when the user signs out or deletes the account on purpose, so guarded
   * pages don't bounce them to /login while they are sent to the homepage.
   */
  leftOnPurpose: boolean;
  markLeftOnPurpose: () => void;
};

let started = false;

export const useSession = create<SessionState>()((set, get) => ({
  status: "loading",
  user: null,
  credits: 0,
  shoots: [],
  leftOnPurpose: false,
  markLeftOnPurpose: () => set({ leftOnPurpose: true }),
  init: () => {
    if (started) return;
    started = true;
    void get().refresh();
    authService.onAuthStateChange(() => void get().refresh());
    creditsService.onBalanceChange(({ credits }) => set({ credits }));
  },
  refresh: async () => {
    const user = await authService.getSession();
    if (!user) {
      set({ status: "guest", user: null, credits: 0, shoots: [] });
      return;
    }
    const [{ credits }, shoots] = await Promise.all([creditsService.getBalance(), shootsService.list()]);
    set({ status: "authenticated", user, credits, shoots, leftOnPurpose: false });
  },
  signOut: async () => {
    set({ leftOnPurpose: true });
    await authService.signOut();
    await get().refresh();
  },
}));
