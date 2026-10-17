"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, MailCheck } from "lucide-react";
import { authService } from "@/services";
import { Button } from "@/components/ui/button";
import { Field } from "./fields";

const schema = z.object({ email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address.") });
type Values = z.infer<typeof schema>;

/** Forgot password — 03-pages §7. The same message for any email (no account enumeration). */
export function ForgotForm() {
  const [sent, setSent] = React.useState(false);
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      await authService.requestPasswordReset(email);
    } finally {
      // Same outcome whether or not the account exists — and even if the request failed.
      setSent(true);
    }
  });

  return (
    <div>
      <h1 className="text-h1 text-text">Forgot your password?</h1>
      <p className="mt-2 text-body text-muted">Enter your email and we&apos;ll send a password-reset link.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
        <Field label="Email address" type="email" autoComplete="email" placeholder="you@example.com" error={formState.errors.email?.message} {...register("email")} />
        <Button type="submit" variant="primary" size="lg" loading={formState.isSubmitting} className="w-full">
          Send Reset Link
          <ArrowRight aria-hidden="true" />
        </Button>
        {sent && (
          <p role="status" className="flex items-start gap-2 rounded-[10px] bg-brand-soft px-3.5 py-3 text-[14px] text-text">
            <MailCheck className="mt-0.5 size-4 shrink-0 text-brand-text" aria-hidden="true" />
            If an account exists for this email, instructions will be sent.
          </p>
        )}
      </form>
      <p className="mt-6 text-center">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-text hover:text-brand-text">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}
