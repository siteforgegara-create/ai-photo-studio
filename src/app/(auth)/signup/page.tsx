import type { Metadata } from "next";
import { AuthStub } from "../auth-stub";

export const metadata: Metadata = { title: "Sign Up", robots: { index: false } };

export default function SignupPage() {
  return <AuthStub title="Create your account" lead="Get 4 free headshot previews." fields={["Full name", "Email", "Password", "Confirm password", "Create Account →", "Continue with Google", "Already have an account? Sign in"]} />;
}
