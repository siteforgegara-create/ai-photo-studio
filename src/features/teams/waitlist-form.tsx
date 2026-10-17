"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { waitlistService, ServiceError, type TeamSize } from "@/services";
import { Button } from "@/components/ui/button";
import { FieldError, Label } from "@/components/ui/input";
import { Field } from "@/features/auth/fields";

const sizes: { value: TeamSize; label: string }[] = [
  { value: "2-10", label: "2–10 people" },
  { value: "11-50", label: "11–50 people" },
  { value: "51-200", label: "51–200 people" },
  { value: "200+", label: "200+ people" },
];

const schema = z.object({
  email: z.string().trim().min(1, "Enter your work email.").email("Enter a valid email address."),
  teamSize: z.enum(["2-10", "11-50", "51-200", "200+"], { message: "Choose your team size." }),
});
type Values = z.infer<typeof schema>;

/** Teams waitlist (P10, 03-pages §5): work email + team size → WaitlistService.join. */
export function WaitlistForm() {
  const [done, setDone] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", teamSize: undefined } });
  const sizeId = React.useId();

  const onSubmit = handleSubmit(async ({ email, teamSize }) => {
    setFormError(null);
    try {
      await waitlistService.join(email, teamSize);
      setDone(true);
    } catch (e) {
      setFormError(e instanceof ServiceError ? e.message : "Something went wrong. Please try again.");
    }
  });

  if (done) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success-text" aria-hidden="true">
          <CheckCircle2 className="size-6" />
        </span>
        <p className="text-[17px] font-bold text-text">Thanks! We&apos;ll let you know when Teams launches.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError && (
        <p role="alert" className="rounded-[10px] bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface))] px-3.5 py-2.5 text-[14px] font-medium text-danger-text">
          {formError}
        </p>
      )}
      <Field label="Work email" type="email" autoComplete="email" placeholder="you@company.com" error={formState.errors.email?.message} {...register("email")} />
      <div>
        <Label htmlFor={sizeId}>Team size</Label>
        <select
          id={sizeId}
          defaultValue=""
          aria-invalid={formState.errors.teamSize ? true : undefined}
          aria-describedby={formState.errors.teamSize ? `${sizeId}-error` : undefined}
          className="h-11 w-full rounded-[10px] border border-border bg-surface-2 px-3 text-[15px] text-text aria-[invalid=true]:border-danger"
          {...register("teamSize")}
        >
          <option value="" disabled>
            Select team size
          </option>
          {sizes.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <FieldError id={`${sizeId}-error`}>{formState.errors.teamSize?.message}</FieldError>
      </div>
      <Button type="submit" variant="primary" size="lg" loading={formState.isSubmitting}>
        Join the waitlist
      </Button>
      <p className="text-[12px] leading-[18px] text-muted">We&apos;ll only use your email to tell you when Teams is available.</p>
    </form>
  );
}
