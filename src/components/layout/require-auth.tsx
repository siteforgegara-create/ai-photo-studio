"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/stores/session";
import { loginHref } from "@/lib/redirects";

/** Client guard for signed-in pages (mock). B1 moves this to middleware + server checks. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useSession((s) => s.status);
  const leftOnPurpose = useSession((s) => s.leftOnPurpose);
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (status === "guest" && !leftOnPurpose) router.replace(loginHref(pathname));
  }, [status, leftOnPurpose, router, pathname]);

  if (status !== "authenticated") {
    return (
      <div className="container-page py-16" aria-busy="true" aria-live="polite">
        <span className="sr-only">Checking your session…</span>
        <div className="h-4 w-40 rounded skeleton" />
        <div className="mt-4 h-10 w-80 max-w-full rounded skeleton" />
        <div className="mt-8 h-48 w-full rounded-[16px] skeleton" />
      </div>
    );
  }
  return <>{children}</>;
}
