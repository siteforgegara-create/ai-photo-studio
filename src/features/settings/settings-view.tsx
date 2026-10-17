"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, ArrowUpRight, Ban, CheckCircle2, Coins, Images, Lock, MonitorSmartphone, Plus, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { authService, creditsService, shootsService, ServiceError, type LedgerEntry } from "@/services";
import { useSession } from "@/stores/session";
import { shootLabel, shootMeta } from "@/components/layout/account-menu";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input, Label } from "@/components/ui/input";
import { Field, PasswordField } from "@/features/auth/fields";
import { cn, formatDate } from "@/lib/utils";

type Notice = { tone: "success" | "error"; text: string } | null;

/** `/settings` — Settings reference, content from 03-pages §6. */
export function SettingsView() {
  const [notice, setNotice] = React.useState<Notice>(null);
  return (
    <div className="container-page py-10 md:py-14">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-overline text-brand-text">ACCOUNT / PREFERENCES</p>
          <h1 className="text-h1 text-text">Account Settings</h1>
          <p className="mt-2 text-[16px] text-muted">Manage your profile, photo privacy and credit activity — all in one place.</p>
        </div>
        <Button asChild variant="secondary" className="self-start md:self-auto">
          <Link href="/studio">
            <ArrowLeft aria-hidden="true" />
            Back to Studio
          </Link>
        </Button>
      </div>

      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className="mt-6 flex items-center justify-between gap-3 rounded-[12px] border border-border bg-surface px-4 py-3 shadow-card"
        >
          <p className={cn("flex items-center gap-2 text-[14px] font-semibold", notice.tone === "success" ? "text-success-text" : "text-danger-text")}>
            {notice.tone === "success" && <CheckCircle2 className="size-4" aria-hidden="true" />}
            {notice.text}
          </p>
          <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={() => setNotice(null)}>
            <X aria-hidden="true" />
          </Button>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <AccountCard onNotice={setNotice} />
        <PrivacyCard onNotice={setNotice} />
      </div>
      <CreditsCard />
      <DeleteAccountCard />
    </div>
  );
}

function CardHead({ icon: Icon, title, lead, id }: { icon: typeof UserRound; title: string; lead: string; id: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand-text" aria-hidden="true">
        <Icon className="size-5" />
      </span>
      <div>
        <h2 id={id} className="text-[18px] leading-6 font-bold text-text">
          {title}
        </h2>
        <p className="text-[14px] text-muted">{lead}</p>
      </div>
    </div>
  );
}

const card = "rounded-[16px] border border-border bg-surface p-5 shadow-card md:p-7";

/* ─────────── My Account ─────────── */

const profileSchema = z.object({ fullName: z.string().trim().min(1, "Enter your name.").max(80, "Use 80 characters or fewer.") });

function AccountCard({ onNotice }: { onNotice: (n: Notice) => void }) {
  const user = useSession((s) => s.user)!;
  const [pwOpen, setPwOpen] = React.useState(false);
  const emailId = React.useId();
  const { register, handleSubmit, formState, reset } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName },
  });

  const onSubmit = handleSubmit(async ({ fullName }) => {
    try {
      const updated = await authService.updateProfile({ fullName });
      reset({ fullName: updated.fullName });
      await useSession.getState().refresh();
      onNotice({ tone: "success", text: "Your profile is saved." });
    } catch (e) {
      onNotice({ tone: "error", text: e instanceof ServiceError ? e.message : "We couldn't save your profile. Please try again." });
    }
  });

  return (
    <section aria-labelledby="account-title" className={card}>
      <CardHead id="account-title" icon={UserRound} title="My Account" lead="Your personal account details." />
      <div className="mt-6 flex items-center gap-4">
        <Avatar name={user.fullName} size={56} className="rounded-[14px]" />
        <div className="min-w-0">
          <p className="truncate text-[16px] font-bold text-text">{user.fullName}</p>
          <p className="truncate text-[13px] text-muted">{user.provider === "google" ? "Signed in with Google" : "Signed in with email"}</p>
        </div>
      </div>
      <form onSubmit={onSubmit} noValidate className="mt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" autoComplete="name" error={formState.errors.fullName?.message} {...register("fullName")} />
          <div>
            <Label htmlFor={emailId}>Email address</Label>
            <Input id={emailId} value={user.email} readOnly aria-describedby={`${emailId}-hint`} className="text-muted" />
            <p id={`${emailId}-hint`} className="mt-1.5 text-[12px] text-muted">
              Your sign-in email.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {user.provider === "google" ? (
            <span className="text-[13px] text-muted">You sign in with Google — no password to manage.</span>
          ) : (
            <button type="button" onClick={() => setPwOpen(true)} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-text underline underline-offset-4 hover:text-brand-text">
              <Lock className="size-4" aria-hidden="true" />
              Change password
            </button>
          )}
          <Button type="submit" variant="primary" loading={formState.isSubmitting} disabled={!formState.isDirty}>
            Save changes
          </Button>
        </div>
      </form>
      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} onDone={() => onNotice({ tone: "success", text: "Your password has been changed." })} />
    </section>
  );
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string().min(1, "Repeat your new password."),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "Passwords don't match." });

function ChangePasswordDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [error, setError] = React.useState<string | null>(null);
  const { register, handleSubmit, formState, reset } = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });

  const close = (o: boolean) => {
    if (!o) {
      reset();
      setError(null);
    }
    onOpenChange(o);
  };

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await authService.changePassword(v.current, v.next);
      close(false);
      onDone();
    } catch (e) {
      setError(e instanceof ServiceError ? e.message : "We couldn't change your password. Please try again.");
    }
  });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogTitle>Change password</DialogTitle>
        <DialogDescription>Use at least 8 characters. You&apos;ll stay signed in on this device.</DialogDescription>
        <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-4">
          {error && (
            <p role="alert" className="rounded-[10px] bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface))] px-3.5 py-2.5 text-[14px] font-medium text-danger-text">
              {error}
            </p>
          )}
          <PasswordField label="Current password" autoComplete="current-password" error={formState.errors.current?.message} {...register("current")} />
          <PasswordField label="New password" autoComplete="new-password" error={formState.errors.next?.message} {...register("next")} />
          <PasswordField label="Confirm new password" autoComplete="new-password" error={formState.errors.confirm?.message} {...register("confirm")} />
          <DialogFooter className="mt-2">
            <Button type="button" variant="secondary" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={formState.isSubmitting}>
              Update password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────── Privacy & Data ─────────── */

function PrivacyCard({ onNotice }: { onNotice: (n: Notice) => void }) {
  const shoots = useSession((s) => s.shoots);
  const [confirm, setConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const deleteAll = async () => {
    setBusy(true);
    try {
      await shootsService.deleteAllPhotos();
      await useSession.getState().refresh();
      setConfirm(false);
      onNotice({ tone: "success", text: "All your photos have been deleted. Your credits are unchanged." });
    } catch (e) {
      onNotice({ tone: "error", text: e instanceof ServiceError ? e.message : "We couldn't delete your photos. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const rows = [
    { title: "Selfies", text: "Deleted automatically 24 hours after each shoot.", badge: <Pill tone="success">Auto</Pill> },
    {
      title: "Headshots & edits",
      text: "Kept for 30 days, then deleted.",
      badge: (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm">
              Manage shoots
              <ArrowUpRight aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>My Shoots</DropdownMenuLabel>
            {shoots.length === 0 ? (
              <DropdownMenuItem asChild>
                <Link href="/shoot/new">
                  <Plus aria-hidden="true" />
                  Start a new shoot
                </Link>
              </DropdownMenuItem>
            ) : (
              shoots.map((s) => (
                <DropdownMenuItem key={s.id} asChild>
                  <Link href={`/shoot/${s.id}`}>
                    <Images aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{shootLabel(s)}</span>
                      <span className="block truncate text-[12px] text-muted">{shootMeta(s)}</span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
    { title: "Free tools", text: "Processed in your browser. Never uploaded.", badge: <Pill tone="neutral">Local</Pill> },
  ];

  return (
    <section aria-labelledby="privacy-title" className={cn(card, "flex flex-col")}>
      <CardHead id="privacy-title" icon={ShieldCheck} title="Privacy & Data" lead="You stay in control of your photos." />
      <ul className="mt-5 flex flex-col">
        {rows.map((r) => (
          <li key={r.title} className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0">
            <div>
              <p className="text-[15px] font-semibold text-text">{r.title}</p>
              <p className="text-[13px] text-muted">{r.text}</p>
            </div>
            <div className="shrink-0">{r.badge}</div>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <Ban className="size-4 shrink-0" aria-hidden="true" />
          No public gallery. Your photos are never shown to others.
        </p>
        <Button variant="danger-outline" size="sm" onClick={() => setConfirm(true)}>
          Delete all my photos
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="danger"
        loading={busy}
        title="Delete all your photos?"
        description="This permanently deletes every shoot's headshots, edits and remaining selfies now. Your credit balance stays. This can't be undone."
        confirmLabel="Delete all photos"
        onConfirm={deleteAll}
      />
    </section>
  );
}

function Pill({ tone, children }: { tone: "success" | "neutral"; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold", tone === "success" ? "bg-success-soft text-success-text" : "bg-surface-2 text-muted")}>
      {tone === "neutral" && <MonitorSmartphone className="mr-1 size-3.5" aria-hidden="true" />}
      {children}
    </span>
  );
}

/* ─────────── Credits & Activity ─────────── */

function CreditsCard() {
  const credits = useSession((s) => s.credits);
  const [ledger, setLedger] = React.useState<LedgerEntry[] | null>(null);

  React.useEffect(() => {
    let alive = true;
    const load = () => void creditsService.getLedger().then((l) => alive && setLedger(l));
    load();
    const off = creditsService.onBalanceChange(load);
    return () => {
      alive = false;
      off();
    };
  }, []);

  return (
    <section aria-labelledby="credits-title" className={cn(card, "mt-6 grid gap-8 lg:grid-cols-[300px_1fr]")}>
      <div className="flex flex-col">
        <CardHead id="credits-title" icon={Coins} title="Credits & Activity" lead="Edit credits and what you spent them on." />
        <div className="mt-6 rounded-[14px] bg-surface-2 p-5">
          <p className="text-[36px] leading-10 font-extrabold text-text tabular-nums">{credits}</p>
          <p className="text-[13px] text-muted">edit credits available · never expire</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="primary">
            <Link href="/pricing#credits">
              Buy credits
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/pricing#credits">How credits work</Link>
          </Button>
        </div>
      </div>
      <div className="min-w-0 overflow-x-auto" tabIndex={0} role="region" aria-label="Credit activity">
        {ledger === null ? (
          <div className="h-40 rounded-[12px] skeleton" aria-hidden="true" />
        ) : ledger.length === 0 ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-border p-6 text-center">
            <p className="text-[15px] font-semibold text-text">No activity yet</p>
            <p className="text-[13px] text-muted">Shoot purchases, credit packs, edits and refunds appear here.</p>
          </div>
        ) : (
          <table className="w-full min-w-[420px] text-left">
            <caption className="sr-only">Credit activity, newest first</caption>
            <thead>
              <tr className="border-b border-border text-[12px] font-semibold text-muted">
                <th scope="col" className="py-2.5 pr-4 font-semibold">
                  Date
                </th>
                <th scope="col" className="py-2.5 pr-4 font-semibold">
                  Activity
                </th>
                <th scope="col" className="py-2.5 text-right font-semibold">
                  Credits
                </th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((e) => (
                <tr key={e.id} className="border-b border-border text-[14px] last:border-b-0">
                  <td className="py-3 pr-4 whitespace-nowrap text-muted">{formatDate(e.createdAt)}</td>
                  <td className="py-3 pr-4 text-text">{e.label}</td>
                  <td className={cn("py-3 text-right font-semibold tabular-nums", e.delta < 0 ? "text-danger-text" : "text-success-text")}>
                    {e.delta > 0 ? `+${e.delta}` : `−${Math.abs(e.delta)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

/* ─────────── Delete Account ─────────── */

function DeleteAccountCard() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputId = React.useId();

  const confirmDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      useSession.getState().markLeftOnPurpose();
      await authService.deleteAccount();
      router.replace("/");
      await useSession.getState().refresh();
    } catch (e) {
      setError(e instanceof ServiceError ? e.message : "We couldn't delete your account. Please try again.");
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="delete-title" className={cn(card, "mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between")}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface))] text-danger-text" aria-hidden="true">
          <Trash2 className="size-5" />
        </span>
        <div>
          <h2 id="delete-title" className="text-[18px] leading-6 font-bold text-text">
            Delete Account
          </h2>
          <p className="text-[14px] text-muted">Delete your account and associated data. This action requires confirmation.</p>
        </div>
      </div>
      <Button variant="danger-outline" onClick={() => setOpen(true)} className="self-start sm:self-auto">
        Delete account
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setTyped("");
            setError(null);
          }
        }}
        tone="danger"
        loading={busy}
        title="Delete your account?"
        description="Your account, shoots, photos, edits and remaining credits will be permanently deleted. This can't be undone."
        confirmLabel="Delete account"
        confirmDisabled={typed !== "DELETE"}
        onConfirm={confirmDelete}
      >
        <Label htmlFor={inputId}>
          Type <span className="font-mono font-bold">DELETE</span> to confirm
        </Label>
        <Input id={inputId} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
        {error && (
          <p role="alert" className="mt-2 text-[13px] font-medium text-danger-text">
            {error}
          </p>
        )}
      </ConfirmDialog>
    </section>
  );
}
