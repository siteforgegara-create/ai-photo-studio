import type { Unsubscribe, User } from "./types";

export type SignUpInput = { fullName: string; email: string; password: string };
export type SignInInput = { email: string; password: string; remember?: boolean };

/** AuthService — Supabase Auth (email + Google) in B1, mock now. */
export interface AuthService {
  getSession(): Promise<User | null>;
  signIn(input: SignInInput): Promise<User>;
  signUp(input: SignUpInput): Promise<User>;
  signInWithGoogle(): Promise<User>;
  signOut(): Promise<void>;
  /** Always resolves the same way, whether or not the email exists. */
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  updateProfile(input: { fullName: string }): Promise<User>;
  /** Signed-in password change (Settings). Google-only accounts get `validation`. */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  /** Deletes the account, all shoots, photos and the credit balance, then signs out (Settings). */
  deleteAccount(): Promise<void>;
  onAuthStateChange(listener: (user: User | null) => void): Unsubscribe;
}
