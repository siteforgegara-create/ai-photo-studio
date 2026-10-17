"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, CircleAlert, CircleCheck, Circle } from "lucide-react";
import { authService, ServiceError } from "@/services";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PasswordField } from "./fields";

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string().min(1, "Repeat your new password."),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match." });
type Values = z.infer<typeof schema>;

/**
 * Reset password — 03-pages §7. Token from `?token=` (B1: Supabase recovery
 * link). Mock: token `expired` shows the expired state.
 */
export function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = React.useState<"form" | "done" | "expired">(token === "expired" ? "expired" : "form");
  const [formError, setFormError] = React.useState<string | null>(null);
  const { register, handleSubmit, formState, control } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });
  const [password, confirm] = useWatch({ control, name: ["password", "confirm"] });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await authService.resetPassword(token, values.password);
      setState("done");
    } catch (e) {
      if (e instanceof ServiceError && /expired/i.test(e.message)) setState("expired");
      else setFormError(e instanceof ServiceError ? e.message : "Something went wrong. Please try again.");
    }
  });

  if (state === "expired") {
    return (
      <div>
        <span className="flex size-12 items-center justify-center rounded-full bg-warning-soft text-warning-text" aria-hidden="true">
          <CircleAlert className="size-6" />
        </span>
        <h1 className="mt-5 text-h1 text-text">This reset link has expired.</h1>
        <p className="mt-2 text-body text-muted">Reset links work for a limited time. Request a new one and use it right away.</p>
        <Button asChild variant="primary" size="lg" className="mt-8 w-full">
          <Link href="/forgot-password">
            Request a new link
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        <BackToSignIn />
      </div>
    );
  }

  if (state === "done") {
    return (
      <div role="status">
        <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success-text" aria-hidden="true">
          <CircleCheck className="size-6" />
        </span>
        <h1 className="mt-5 text-h1 text-text">Password updated</h1>
        <p className="mt-2 text-body text-muted">You can now sign in with your new password.</p>
        <Button asChild variant="primary" size="lg" className="mt-8 w-full">
          <Link href="/login">
            Sign In
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    );
  }

  const checks = [
    { ok: password.length >= 8, label: "8+ characters" },
    { ok: password.length > 0 && password === confirm, label: "Passwords match" },
  ];

  return (
    <div>
      <h1 className="text-h1 text-text">Create new password</h1>
      <p className="mt-2 text-body text-muted">Choose a new password for your account.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
        {formError && (
          <p role="alert" className="rounded-[10px] bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface))] px-3.5 py-2.5 text-[14px] font-medium text-danger-text">
            {formError}
          </p>
        )}
        <PasswordField label="New password" autoComplete="new-password" placeholder="Enter new password" error={formState.errors.password?.message} {...register("password")} />
        <PasswordField label="Confirm new password" autoComplete="new-password" placeholder="Repeat new password" error={formState.errors.confirm?.message} {...register("confirm")} />
        <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Password requirements">
          {checks.map((c) => (
            <li key={c.label} className={cn("flex items-center gap-1.5 text-[13px] font-medium", c.ok ? "text-success-text" : "text-muted")}>
              {c.ok ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : <Circle className="size-3" aria-hidden="true" />}
              {c.label}
              <span className="sr-only">{c.ok ? " — done" : " — not yet"}</span>
            </li>
          ))}
        </ul>
        <Button type="submit" variant="primary" size="lg" loading={formState.isSubmitting} className="w-full">
          Update Password
          <ArrowRight aria-hidden="true" />
        </Button>
      </form>
      <BackToSignIn />
    </div>
  );
}

function BackToSignIn() {
  return (
    <p className="mt-6 text-center">
      <Link href="/login" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-text hover:text-brand-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Sign In
      </Link>
    </p>
  );
}
