"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const TRANSITION_CLASS = "theme-transition";

/** Applies the theme with a short colour-only transition (01-design-system §5). */
export function useThemeSwitch() {
  const { setTheme } = useTheme();
  return React.useCallback(
    (next: "light" | "dark") => {
      const root = document.documentElement;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce) root.classList.add(TRANSITION_CLASS);
      setTheme(next);
      window.setTimeout(() => root.classList.remove(TRANSITION_CLASS), 240);
    },
    [setTheme],
  );
}

const noopSubscribe = () => () => {};
/** true after hydration, false during SSR — without a setState-in-effect. */
export function useMounted() {
  return React.useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/**
 * `☀ Light | ☾ Dark` segmented toggle (decision V3, Pricing reference).
 * The active segment is styled from the `html.dark` class, so it is correct on
 * the very first paint — no flash, no hydration mismatch.
 */
export function SegmentedThemeToggle({ className, size = "md" }: { className?: string; size?: "sm" | "md" }) {
  const switchTheme = useThemeSwitch();
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";

  const segment =
    "inline-flex items-center gap-1.5 rounded-[8px] font-semibold transition-[background-color,color,box-shadow] duration-[120ms] ease-out [&_svg]:size-[15px] " +
    (size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3 text-[13px]");

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn("inline-flex items-center gap-0.5 rounded-[10px] border border-border bg-surface-2 p-[3px]", className)}
    >
      <button
        type="button"
        role="radio"
        aria-checked={mounted ? !isDark : undefined}
        suppressHydrationWarning
        onClick={() => switchTheme("light")}
        className={cn(
          segment,
          "text-muted hover:text-text",
          "[html:not(.dark)_&]:bg-surface [html:not(.dark)_&]:text-text [html:not(.dark)_&]:shadow-[0_1px_2px_rgba(16,24,40,.08),0_1px_6px_rgba(16,24,40,.06)]",
        )}
      >
        <Sun aria-hidden="true" />
        <span className="max-[399px]:sr-only">Light</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mounted ? isDark : undefined}
        suppressHydrationWarning
        onClick={() => switchTheme("dark")}
        className={cn(segment, "text-muted hover:text-text", "[html.dark_&]:bg-surface [html.dark_&]:text-text [html.dark_&]:ring-1 [html.dark_&]:ring-border")}
      >
        <Moon aria-hidden="true" />
        <span className="max-[399px]:sr-only">Dark</span>
      </button>
    </div>
  );
}
