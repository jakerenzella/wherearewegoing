"use server";

import { redirect } from "next/navigation";
import { authServer } from "@/lib/auth/server";
import { isAllowed } from "@/lib/allowlist";

export type SendOtpState =
  | { error: string; sent?: never; email?: never; name?: never }
  | { sent: true; email: string; name: string; error?: never }
  | null;

export async function sendOtp(
  _prev: SendOtpState,
  formData: FormData,
): Promise<SendOtpState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!email) return { error: "Email is required." };
  if (!isAllowed(email)) return { error: "That email isn't on the invite list." };

  const { error } = await authServer.emailOtp.sendVerificationOtp({
    email,
    type: "sign-in",
  });
  if (error) return { error: error.message || "Could not send code." };

  return { sent: true, email, name };
}

export type VerifyOtpState = { error: string } | null;

export async function verifyOtp(
  _prev: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const otp = String(formData.get("otp") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!email || !otp) return { error: "Email and code required." };

  const { error } = await authServer.signIn.emailOtp({
    email,
    otp,
    ...(name ? { name } : {}),
  });
  if (error) return { error: error.message || "Invalid or expired code." };

  redirect("/");
}
