"use client";

import * as React from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { authService, ServiceError } from "@/services";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, GoogleMark, OrDivider, PasswordField } from "./fields";
import { useAfterAuth, useNextParam } from "./use-after-auth";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean(),
});
type Values = z.infer<typeof schema>;

/** Login — 03-pages §7. Mock: any email + password ≥ 8 signs in; fail@example.com fails. */
export function LoginForm() {
  const afterAuth = useAfterAuth();
  const next = useNextParam();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [google, setGoogle] = React.useState(false);
  const { register, handleSubmit, control, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await authService.signIn(values);
      await afterAuth();
    } catch (e) {
      setFormError(e instanceof ServiceError ? e.message : "Something went wrong. Please try again.");
    }
  });

  const withNext = (path: string) => (next ? `${path}?next=${encodeURIComponent(next)}` : path);

  return (
    <div>
      <h1 className="text-h1 text-text">Welcome back</h1>
      <p className="mt-2 text-body text-muted">Sign in to see your headshots.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
        {formError && (
          <p role="alert" className="rounded-[10px] bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface))] px-3.5 py-2.5 text-[14px] font-medium text-danger-text">
            {formError}
          </p>
        )}
        <Field label="Email address" type="email" autoComplete="email" placeholder="you@example.com" error={formState.errors.email?.message} {...register("email")} />
        <PasswordField label="Password" autoComplete="current-password" placeholder="Enter password" error={formState.errors.password?.message} {...register("password")} />
        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[14px] text-text">
            <Controller control={control} name="remember" render={({ field }) => <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />} />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-[14px] font-semibold text-brand-text hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" variant="primary" size="lg" loading={formState.isSubmitting} className="w-full">
          Sign In
          <ArrowRight aria-hidden="true" />
        </Button>
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
          Don&apos;t have an account?{" "}
          <Link href={withNext("/signup")} className="font-semibold text-brand-text hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
