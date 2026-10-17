import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetForm } from "@/features/auth/reset-form";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
