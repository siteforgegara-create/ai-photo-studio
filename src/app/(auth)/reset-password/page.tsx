import type { Metadata } from "next";
import { AuthStub } from "../auth-stub";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ResetPasswordPage() {
  return <AuthStub title="Create new password" lead="Choose a new password for your account." fields={["New password", "Confirm new password", "Live checks: 8+ characters · Passwords match", "Update Password →", "Expired-link state"]} />;
}
