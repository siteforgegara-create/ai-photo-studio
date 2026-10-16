"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Menu, Plus } from "lucide-react";
import { useSession } from "@/stores/session";
import { Button } from "@/components/ui/button";
import { CreditsPill } from "@/components/ui/credits-pill";
import { Logo } from "@/components/ui/logo";
import { SegmentedThemeToggle } from "@/components/ui/segmented-theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./account-menu";
import { MobileNav } from "./mobile-nav";
import { freeTools, marketingNav } from "./nav-links";

const navLink =
  "inline-flex h-10 items-center gap-1 rounded-[10px] px-3 text-[14px] font-medium text-muted transition-colors duration-[120ms] hover:text-text data-[active]:text-text data-[active]:font-semibold";

/**
 * MarketingHeader — decision V2.
 * Logo · How It Works · Pricing · Examples · Free Tools ▾ · Light/Dark ·
 * guest: Log In + `Get your headshots →`; signed in: credits · avatar ▾ + `New shoot`.
 */
export function MarketingHeader() {
  const pathname = usePathname();
  const { status, credits } = useSession();

  return (
    <header className="sticky top-0 z-40 h-[var(--header-h)] border-b border-border bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur-md">
      <div className="container-page flex h-full items-center gap-4">
        <Logo className="mr-2 shrink-0" />

        <nav aria-label="Main" className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {marketingNav.map((item) => (
            <Link key={item.href} href={item.href} className={navLink} data-active={pathname === item.href || undefined}>
              {item.label}
            </Link>
          ))}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger className={cn(navLink, "data-[state=open]:text-text")} data-active={pathname.startsWith("/tools") || undefined}>
              Free Tools
              <ChevronDown className="size-4" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-72">
              {freeTools.map((tool) => (
                <DropdownMenuItem key={tool.href} asChild>
                  <Link href={tool.href} className="items-start gap-3 py-2.5">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft [&_svg]:text-brand!">
                      <tool.icon aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-[14px] font-semibold text-text">{tool.label}</span>
                      <span className="block text-[13px] text-muted">{tool.description}</span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <SegmentedThemeToggle className="hidden md:inline-flex" />
          <AuthArea status={status} credits={credits} />
          <MobileNav trigger={
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu aria-hidden="true" />
            </Button>
          } />
        </div>
      </div>
    </header>
  );
}

function AuthArea({ status, credits }: { status: ReturnType<typeof useSession.getState>["status"]; credits: number }) {
  if (status === "loading") {
    // Reserve the space so the bar doesn't jump once the session resolves.
    return <span className="hidden h-10 w-[248px] rounded-[10px] skeleton opacity-60 md:block" aria-hidden="true" />;
  }
  if (status === "guest") {
    return (
      <>
        <Button asChild variant="ghost" className="hidden md:inline-flex">
          <Link href="/login">Log In</Link>
        </Button>
        <Button asChild variant="primary" className="hidden sm:inline-flex">
          <Link href="/shoot/new">
            Get your headshots
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </>
    );
  }
  return (
    <>
      <CreditsPill credits={credits} className="hidden md:inline-flex" />
      <AccountMenu showName />
      <Button asChild variant="primary" className="hidden sm:inline-flex">
        <Link href="/shoot/new">
          <Plus aria-hidden="true" />
          New shoot
        </Link>
      </Button>
    </>
  );
}
