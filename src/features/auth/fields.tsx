"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { FieldError, Input, Label } from "@/components/ui/input";

type FieldProps = React.ComponentProps<"input"> & { label: string; error?: string };

/** Labelled input with an error message wired through aria-describedby. */
export function Field({ label, error, id: idProp, ...props }: FieldProps) {
  const autoId = React.useId();
  const id = idProp ?? autoId;
  const errId = `${id}-error`;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? errId : undefined} {...props} />
      <FieldError id={errId}>{error}</FieldError>
    </div>
  );
}

export function PasswordField({ label, error, id: idProp, ...props }: FieldProps) {
  const autoId = React.useId();
  const id = idProp ?? autoId;
  const errId = `${id}-error`;
  const [visible, setVisible] = React.useState(false);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={visible ? "text" : "password"} className="pr-11" aria-invalid={error ? true : undefined} aria-describedby={error ? errId : undefined} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-muted hover:bg-surface hover:text-text"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}
        </button>
      </div>
      <FieldError id={errId}>{error}</FieldError>
    </div>
  );
}

/** Google "G" mark (brand asset of the sign-in provider, used as instructed by Google's branding guidelines). */
export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-[13px] text-muted" role="separator" aria-label="or continue with">
      <span className="h-px flex-1 bg-border" />
      or continue with
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
