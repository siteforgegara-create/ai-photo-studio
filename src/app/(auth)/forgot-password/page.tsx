import type { Metadata } from "next";
import { AuthStub } from "../auth-stub";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return <AuthStub title="Forgot your password?" lead="Enter your email and we'll send a password-reset link." fields={["Email", "Send Reset Link →", "Neutral confirmation message", "← Back to Sign In"]} />;
}
