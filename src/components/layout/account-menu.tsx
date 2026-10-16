"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Coins, Images, LogOut, Plus, Settings, Sparkles } from "lucide-react";
import { getShootPack } from "@/config/packs";
import { useSession } from "@/stores/session";
import type { Shoot } from "@/services/types";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SegmentedThemeToggle } from "@/components/ui/segmented-theme-toggle";
import { cn, formatDate } from "@/lib/utils";

function shootLabel(shoot: Shoot) {
  return shoot.title ?? getShootPack(shoot.pack).name;
}

function shootMeta(shoot: Shoot) {
  if (shoot.status === "generating") return `Generating · ${shoot.readyCount} of ${shoot.targetCount}`;
  if (shoot.status === "refunded") return "Refunded";
  return formatDate(shoot.createdAt);
}

/**
 * Avatar ▾ menu (01-design-system §4, decision V2): My Shoots (list of the
 * user's shoots — there is no separate list page), Studio, Account Settings,
 * Buy credits, Sign out. `withTheme` adds the theme toggle for compact
 * headers where it doesn't fit in the bar.
 */
export function AccountMenu({ withTheme = false, showName = false }: { withTheme?: boolean; showName?: boolean }) {
  const { user, shoots, signOut } = useSession();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  if (!user) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger
        className="inline-flex h-10 items-center gap-2 rounded-full pr-1 pl-0.5 transition-colors hover:bg-surface-2 data-[state=open]:bg-surface-2"
        aria-label={`Account menu for ${user.fullName}`}
      >
        <Avatar name={user.fullName} />
        {showName && <span className="hidden text-[14px] font-semibold text-text xl:inline">{user.fullName.split(" ")[0]}</span>}
        <ChevronDown className="size-4 text-muted" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <Avatar name={user.fullName} size={40} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-text">{user.fullName}</p>
            <p className="truncate text-[13px] text-muted">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Images aria-hidden="true" />
            <span className="flex-1">My Shoots</span>
            <span className="rounded-full bg-surface-2 px-2 text-[12px] font-semibold text-muted">{shoots.length}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-72">
            <DropdownMenuLabel>My Shoots</DropdownMenuLabel>
            {shoots.length === 0 ? (
              <div className="px-2.5 pb-2">
                <p className="text-[13px] text-muted">No shoots yet.</p>
                <DropdownMenuItem asChild className="mt-1">
                  <Link href="/shoot/new">
                    <Plus aria-hidden="true" />
                    Start a new shoot
                  </Link>
                </DropdownMenuItem>
              </div>
            ) : (
              shoots.map((shoot) => (
                <DropdownMenuItem key={shoot.id} asChild>
                  <Link href={`/shoot/${shoot.id}`} className="gap-3">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-[8px] bg-surface-2">
                      {shoot.coverUrl && <Image src={shoot.coverUrl} alt="" fill sizes="40px" className="object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-text">{shootLabel(shoot)}</span>
                      <span className="block truncate text-[12px] text-muted">{shootMeta(shoot)}</span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuItem asChild>
          <Link href="/studio">
            <Sparkles aria-hidden="true" />
            Studio
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings aria-hidden="true" />
            Account Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/pricing#credits">
            <Coins aria-hidden="true" />
            Buy credits
          </Link>
        </DropdownMenuItem>

        {withTheme && (
          <>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
              <span className="text-[13px] font-medium text-muted">Theme</span>
              <SegmentedThemeToggle size="sm" />
            </div>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={cn("text-text")}
          onSelect={async () => {
            await signOut();
            router.push("/");
          }}
        >
          <LogOut aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
