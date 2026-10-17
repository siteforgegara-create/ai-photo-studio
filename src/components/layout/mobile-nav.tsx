"use client";

import * as React from "react";
import Link from "next/link";
import { Dialog as Primitive } from "radix-ui";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { ArrowRight, Plus, X } from "lucide-react";
import { useSession } from "@/stores/session";
import { Button } from "@/components/ui/button";
import { CreditsPill } from "@/components/ui/credits-pill";
import { Logo } from "@/components/ui/logo";
import { SegmentedThemeToggle } from "@/components/ui/segmented-theme-toggle";
import { freeTools, marketingNav } from "./nav-links";

/** Mobile / tablet navigation drawer for the MarketingHeader (< 1024 px). */
export function MobileNav({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const reduce = useReducedMotion();
  const { status, credits } = useSession();

  return (
    <Primitive.Root open={open} onOpenChange={setOpen}>
      <Primitive.Trigger asChild>{trigger}</Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Overlay className="fixed inset-0 z-50 bg-scrim data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Primitive.Content asChild aria-describedby={undefined}>
          <m.div
            initial={reduce ? false : { x: "100%" }}
            animate={{ x: 0 }}
            transition={{ type: "spring", duration: 0.26, bounce: 0 }}
            className="fixed inset-y-0 right-0 z-50 flex w-[min(360px,100vw)] flex-col border-l border-border bg-surface shadow-pop outline-none"
          >
            <div className="flex h-[var(--header-h)] items-center justify-between border-b border-border px-4">
              <Logo size="sm" />
              <Primitive.Title className="sr-only">Menu</Primitive.Title>
              <Primitive.Close className="inline-flex size-10 items-center justify-center rounded-[10px] text-muted hover:bg-surface-2 hover:text-text">
                <X className="size-5" aria-hidden="true" />
                <span className="sr-only">Close menu</span>
              </Primitive.Close>
            </div>
            <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-4 py-4">
              <ul className="flex flex-col gap-1">
                {marketingNav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} onClick={() => setOpen(false)} className="flex h-12 items-center rounded-[10px] px-3 text-[16px] font-semibold text-text hover:bg-surface-2">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-5 mb-1 px-3 text-overline text-muted">Free Tools</p>
              <ul className="flex flex-col gap-1">
                {freeTools.map((tool) => (
                  <li key={tool.href}>
                    <Link href={tool.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 rounded-[10px] px-3 py-2 hover:bg-surface-2">
                      <tool.icon className="size-[18px] text-brand" aria-hidden="true" />
                      <span>
                        <span className="block text-[15px] font-semibold text-text">{tool.label}</span>
                        <span className="block text-[13px] text-muted">{tool.description}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center justify-between gap-3 px-3">
                <span className="text-[14px] font-medium text-muted">Theme</span>
                <SegmentedThemeToggle />
              </div>
            </nav>
            <div className="flex flex-col gap-2 border-t border-border p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
              {status === "authenticated" ? (
                <>
                  <CreditsPill credits={credits} className="self-start" />
                  <Button asChild variant="primary" size="lg">
                    <Link href="/shoot/new" onClick={() => setOpen(false)}>
                      <Plus aria-hidden="true" />
                      New shoot
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="primary" size="lg">
                    <Link href="/shoot/new" onClick={() => setOpen(false)}>
                      Get your headshots
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" size="lg">
                    <Link href="/login" onClick={() => setOpen(false)}>
                      Log In
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </m.div>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
