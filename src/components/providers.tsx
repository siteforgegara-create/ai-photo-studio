"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSession } from "@/stores/session";

function SessionBootstrap() {
  const init = useSession((s) => s.init);
  React.useEffect(() => init(), [init]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="aps-theme" disableTransitionOnChange>
      {/* `reducedMotion="user"` makes every Motion animation instant under prefers-reduced-motion. */}
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={300}>
          <SessionBootstrap />
          {children}
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
