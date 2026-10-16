import type { Metadata } from "next";
import { AuthStub } from "../auth-stub";

export const metadata: Metadata = { title: "Log In", robots: { index: false } };

export default function LoginPage() {
  return <AuthStub title="Welcome back" lead="Sign in to see your headshots." fields={["Email", "Password", "Remember me · Forgot password?", "Sign In →", "Continue with Google", "Don't have an account? Sign up"]} />;
}
