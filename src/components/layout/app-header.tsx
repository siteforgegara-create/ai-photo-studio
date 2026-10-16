"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft } from "lucide-react";
import { useSession } from "@/stores/session";
import { Button } from "@/components/ui/button";
import { CreditsPill } from "@/components/ui/credits-pill";
import { Logo } from "@/components/ui/logo";
import { SegmentedThemeToggle } from "@/components/ui/segmented-theme-toggle";
import { AccountMenu } from "./account-menu";

/**
 * App header for /shoot/* and /studio (decision V2):
 * Logo · (Studio: `← Back to shoot`) · credits pill · `Buy credits` · Light/Dark · avatar.
 * Mobile (02-studio §6): Logo · `‹ Shoot` · credits pill · avatar (theme moves into the menu).
 */
export function AppHeader({ backHref }: { backHref?: string | null }) {
  const { status, credits } = useSession();

  return (
    <header className="sticky top-0 z-40 h-[var(--header-h)] border-b border-border bg-surface">
      <div className="flex h-full items-center gap-3 px-4 md:px-6">
        <Logo className="shrink-0 max-md:[&>span:last-child]:sr-only" />
        {backHref && (
          <>
            <span className="hidden h-6 w-px bg-border md:block" aria-hidden="true" />
            <Button asChild variant="ghost" size="sm" className="text-muted hover:text-text">
              <Link href={backHref}>
                <ArrowLeft className="hidden md:block" aria-hidden="true" />
                <ChevronLeft className="md:hidden" aria-hidden="true" />
                <span className="hidden md:inline">Back to shoot</span>
                <span className="md:hidden">Shoot</span>
              </Link>
            </Button>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          {status === "loading" && <span className="h-10 w-40 rounded-[10px] skeleton opacity-60" aria-hidden="true" />}
          {status === "authenticated" && (
            <>
              <CreditsPill credits={credits} />
              <Button asChild variant="secondary" className="hidden md:inline-flex">
                <Link href="/pricing#credits">Buy credits</Link>
              </Button>
              <SegmentedThemeToggle className="hidden md:inline-flex" />
              <span className="md:hidden">
                <AccountMenu withTheme />
              </span>
              <span className="hidden md:inline-flex">
                <AccountMenu />
              </span>
            </>
          )}
          {status === "guest" && (
            <>
              <SegmentedThemeToggle className="hidden md:inline-flex" />
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild variant="primary" size="md">
                <Link href="/shoot/new">
                  <span className="hidden sm:inline">Get your headshots</span>
                  <span className="sm:hidden">Get started</span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
