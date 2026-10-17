"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { LazyMotion, MotionConfig } from "motion/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSession } from "@/stores/session";

const loadMotionFeatures = () => import("@/lib/motion-features").then((m) => m.default);

function SessionBootstrap() {
  const init = useSession((s) => s.init);
  React.useEffect(() => init(), [init]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="aps-theme" disableTransitionOnChange>
      {/* `reducedMotion="user"` makes every Motion animation instant under prefers-reduced-motion. */}
      {/* LazyMotion + `m.*` components: Motion's features load on demand, `strict` forbids the heavy `motion.*`. */}
      <LazyMotion features={loadMotionFeatures} strict>
        <MotionConfig reducedMotion="user">
          <TooltipProvider delayDuration={300}>
            <SessionBootstrap />
            {children}
          </TooltipProvider>
        </MotionConfig>
      </LazyMotion>
    </ThemeProvider>
  );
}
