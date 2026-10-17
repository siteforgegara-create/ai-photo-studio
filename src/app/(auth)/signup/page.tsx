import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/features/auth/signup-form";

export const metadata: Metadata = { title: "Sign Up", robots: { index: false } };

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
