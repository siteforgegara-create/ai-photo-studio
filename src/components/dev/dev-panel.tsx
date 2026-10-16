"use client";

import * as React from "react";
import Link from "next/link";
import { Bug, X } from "lucide-react";
import { getDb, getFlags, setFlags, setScenario } from "@/services/mock/db";
import { scenarioIds, scenarioLabels, type DevFlags, type ScenarioId } from "@/services/mock/scenarios";
import { useSession } from "@/stores/session";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/**
 * Dev panel (CLAUDE.md §5) — development only. Switches mock scenarios and
 * error toggles. Rendered only when devToolsEnabled (see layout).
 */
export function DevPanel() {
  const [open, setOpen] = React.useState(false);
  const [scenario, setScenarioState] = React.useState<ScenarioId | null>(null);
  const [flags, setFlagsState] = React.useState<DevFlags | null>(null);
  const refresh = useSession((s) => s.refresh);

  const sync = () => {
    setScenarioState(getDb().scenario);
    setFlagsState(getFlags());
  };

  const choose = async (id: ScenarioId) => {
    setScenario(id);
    sync();
    await refresh();
  };

  const toggle = (key: "failGeneration" | "failEdit" | "blockEdit") => {
    setFlags({ [key]: !getFlags()[key] });
    sync();
  };

  return (
    <div data-dev-panel className="fixed bottom-4 left-4 z-[60] print:hidden">
      {open && scenario && flags ? (
        <div role="dialog" aria-label="Dev panel" className="w-80 rounded-[14px] border border-border bg-surface p-4 text-text shadow-pop">
          <div className="flex items-center justify-between">
            <p className="text-overline text-muted">Dev panel · mock data</p>
            <button type="button" onClick={() => setOpen(false)} className="inline-flex size-8 items-center justify-center rounded-[8px] text-muted hover:bg-surface-2" aria-label="Close dev panel">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <fieldset className="mt-3">
            <legend className="text-[13px] font-semibold">Scenario</legend>
            <div className="mt-2 flex flex-col gap-1">
              {scenarioIds.map((id) => (
                <label key={id} className={cn("flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 text-[13px] hover:bg-surface-2", scenario === id && "bg-brand-soft text-brand-text")}>
                  <input type="radio" name="dev-scenario" className="accent-[var(--brand)]" checked={scenario === id} onChange={() => void choose(id)} />
                  {scenarioLabels[id]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-3 border-t border-border pt-3">
            <legend className="sr-only">Errors</legend>
            {(
              [
                ["failGeneration", "Generation fails"],
                ["failEdit", "Edits fail (credits returned)"],
                ["blockEdit", "Edits blocked by moderation"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 py-1 text-[13px]">
                <Checkbox checked={flags[key]} onCheckedChange={() => toggle(key)} />
                {label}
              </label>
            ))}
          </fieldset>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[13px]">
            <Link href="/dev/ui" className="font-semibold text-brand-text hover:underline">
              /dev/ui
            </Link>
            <span className="text-muted">Stored in localStorage</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            sync();
            setOpen(true);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-[13px] font-semibold text-text shadow-pop hover:bg-surface-2"
          aria-label="Open dev panel"
        >
          <Bug className="size-4 text-brand" aria-hidden="true" />
          Dev
        </button>
      )}
    </div>
  );
}
