"use client";

import * as React from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

/**
 * Route-level error boundary: an unexpected runtime error shows a calm,
 * on-brand screen with Try again instead of Next's default. Nothing is
 * charged or lost — credits are only spent after an explicit confirmation.
 */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    // TODO(B6): report to Sentry. Until then keep it in the console for debugging.
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="flex flex-1 flex-col">
      <div className="container-page flex h-[var(--header-h)] items-center">
        <Logo />
      </div>
      <div className="container-page flex flex-1 flex-col items-center justify-center py-20 text-center">
        <p className="text-overline text-brand-text">Error</p>
        <h1 className="mt-3 text-h1 text-text">Something went wrong</h1>
        <p className="mx-auto mt-3 max-w-md text-body text-muted">
          This page hit an unexpected problem. Your photos and credits are safe — please try again.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="secondary" size="lg">
            <Link href="/">Go to homepage</Link>
          </Button>
          <Button variant="primary" size="lg" onClick={() => reset()}>
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
        </div>
        {error.digest && <p className="mt-6 text-small text-muted">Reference: {error.digest}</p>}
      </div>
    </main>
  );
}
