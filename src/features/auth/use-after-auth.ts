"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { shootsService } from "@/services";
import { useSession } from "@/stores/session";
import { getPostLoginRedirect } from "@/lib/redirects";

/** After sign-in: safe `next` → latest shoot → /shoot/new (CLAUDE.md §6). */
export function useAfterAuth() {
  const router = useRouter();
  const params = useSearchParams();
  return async () => {
    await useSession.getState().refresh();
    const shoots = await shootsService.list();
    router.replace(getPostLoginRedirect(shoots, params.get("next")));
  };
}

export function useNextParam() {
  return useSearchParams().get("next");
}
