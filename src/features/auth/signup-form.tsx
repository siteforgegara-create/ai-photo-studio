"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { authService, ServiceError } from "@/services";
import { Button } from "@/components/ui/button";
import { Field, GoogleMark, OrDivider, PasswordField } from "./fields";
import { useAfterAuth, useNextParam } from "./use-after-auth";

const schema = z
  .object({
    fullName: z.string().trim().min(1, "Enter your name."),
    email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address."),
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string().min(1, "Repeat your password."),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords must match." });
type Values = z.infer<typeof schema>;

/** Sign Up — 03-pages §7 (Google button per V6). */
export function SignupForm() {
  const afterAuth = useAfterAuth();
  const next = useNextParam();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [google, setGoogle] = React.useState(false);
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", password: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async ({ fullName, email, password }) => {
    setFormError(null);
    try {
      await authService.signUp({ fullName, email, password });
      await afterAuth();
    } catch (e) {
      setFormError(e instanceof ServiceError ? e.message : "Something went wrong. Please try again.");
    }
  });

  return (
    <div>
      <h1 className="text-h1 text-text">Create your account</h1>
      <p className="mt-2 text-body text-muted">Get 4 free headshot previews.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
        {formError && (
          <p role="alert" className="rounded-[10px] bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface))] px-3.5 py-2.5 text-[14px] font-medium text-danger-text">
            {formError}
          </p>
        )}
        <Field label="Full name" autoComplete="name" placeholder="Your name" error={formState.errors.fullName?.message} {...register("fullName")} />
        <Field label="Email address" type="email" autoComplete="email" placeholder="you@example.com" error={formState.errors.email?.message} {...register("email")} />
        <PasswordField label="Password" autoComplete="new-password" placeholder="Create a password" error={formState.errors.password?.message} {...register("password")} />
        <PasswordField label="Confirm password" autoComplete="new-password" placeholder="Repeat your password" error={formState.errors.confirm?.message} {...register("confirm")} />
        <Button type="submit" variant="primary" size="lg" loading={formState.isSubmitting} className="w-full">
          Create Account
          <ArrowRight aria-hidden="true" />
        </Button>
        <p className="text-center text-[13px] leading-[18px] text-muted">
          By continuing, you agree to the{" "}
          <Link href="/terms" className="font-semibold text-brand-text hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-semibold text-brand-text hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
      <div className="mt-6 flex flex-col gap-4">
        <OrDivider />
        <Button
          variant="secondary"
          size="lg"
          loading={google}
          onClick={async () => {
            setGoogle(true);
            await authService.signInWithGoogle();
            await afterAuth();
          }}
        >
          <GoogleMark />
          Continue with Google
        </Button>
        <p className="text-center text-[14px] text-muted">
          Already have an account?{" "}
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-brand-text hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
